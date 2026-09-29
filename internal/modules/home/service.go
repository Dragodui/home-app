package home

import (
	"context"
	"errors"
	"strings"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/metrics"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/modules/notification"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	repo     Repository
	cache    *redis.Client
	notifSvc notification.IService
}

type IService interface {
	CreateHome(ctx context.Context, name string, userID int) error
	RegenerateInviteCode(ctx context.Context, homeID int) error
	JoinHomeByCode(ctx context.Context, code string, userID int) error
	GetHomeByID(ctx context.Context, id int) (*models.Home, error)
	DeleteHome(ctx context.Context, id int) error
	LeaveHome(ctx context.Context, homeID int, userID int) error
	RemoveMember(ctx context.Context, homeID int, userID int, currentUserID int) error
	GetMembers(ctx context.Context, homeID int) ([]models.HomeMembership, error)
	GetUserHome(ctx context.Context, userID int) (*models.Home, error)
	GetUserHomes(ctx context.Context, userID int) ([]models.Home, error)
	ApproveMember(ctx context.Context, homeID int, userID int) error
	RejectMember(ctx context.Context, homeID int, userID int) error
	GetPendingMembers(ctx context.Context, homeID int) ([]models.HomeMembership, error)
	UpdateMemberRole(ctx context.Context, homeID int, userID int, role string) error
	GetHomeCurrency(ctx context.Context, homeID int) (string, error)
	UpdateHome(ctx context.Context, homeID int, req models.UpdateHomeRequest) error
}

func NewService(repo Repository, cache *redis.Client, notifSvc notification.IService) *Service {
	return &Service{repo: repo, cache: cache, notifSvc: notifSvc}
}

func (s *Service) CreateHome(ctx context.Context, name string, userID int) error {
	inviteCode, err := s.repo.GenerateUniqueInviteCode(ctx)
	if err != nil {
		return err
	}

	home := &models.Home{
		Name:       name,
		InviteCode: inviteCode,
	}

	if err := s.repo.Create(ctx, home); err != nil {
		return err
	}

	if err := s.repo.AddMember(ctx, home.ID, userID, "admin", "approved"); err != nil {
		return err
	}

	// invalidate user homes list cache
	if err := utils.DeleteFromCache(ctx, utils.GetUserHomesKey(userID), s.cache); err != nil {
		logger.Info.Printf("Failed to delete user homes cache: %v", err)
	}

	metrics.HomesTotal.Inc()
	metrics.HomeOperationsTotal.WithLabelValues("create").Inc()

	event.SendHomeEvent(ctx, s.cache, home.ID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionCreated,
		Data:   home,
	})

	return nil
}

func (s *Service) RegenerateInviteCode(ctx context.Context, homeID int) error {
	inviteCode, err := s.repo.GenerateUniqueInviteCode(ctx)
	if err != nil {
		return err
	}

	key := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := s.repo.RegenerateCode(ctx, inviteCode, homeID); err != nil {
		return err
	}

	// invalidate every member's cached user-homes list, else it keeps serving
	// the old invite code after regeneration.
	if members, err := s.repo.GetMembers(ctx, homeID); err == nil {
		for _, member := range members {
			userHomesKey := utils.GetUserHomesKey(member.UserID)
			if deleteErr := utils.DeleteFromCache(ctx, userHomesKey, s.cache); deleteErr != nil {
				logger.Info.Printf("Failed to delete redis cache for key %s: %v", userHomesKey, deleteErr)
			}
			userHomeKey := utils.GetUserHomeKey(member.UserID)
			if deleteErr := utils.DeleteFromCache(ctx, userHomeKey, s.cache); deleteErr != nil {
				logger.Info.Printf("Failed to delete redis cache for key %s: %v", userHomeKey, deleteErr)
			}
		}
	} else {
		logger.Info.Printf("Failed to load members for cache invalidation on home %d: %v", homeID, err)
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionUpdated,
		Data:   map[string]int{"homeID": homeID},
	})

	return nil
}

func (s *Service) JoinHomeByCode(ctx context.Context, code string, userID int) error {
	home, err := s.repo.FindByInviteCode(ctx, code)
	if err != nil || home == nil {
		return errors.New("invalid invite code")
	}

	already, err := s.repo.IsMember(ctx, home.ID, userID)
	if err != nil {
		return err
	}
	if already {
		return errors.New("user already in this home")
	}

	pending, err := s.repo.IsPendingMember(ctx, home.ID, userID)
	if err != nil {
		return err
	}
	if pending {
		return errors.New("join request already pending")
	}

	key := utils.GetHomeCacheKey(home.ID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := s.repo.AddMember(ctx, home.ID, userID, "member", "pending"); err != nil {
		return err
	}

	metrics.HomeOperationsTotal.WithLabelValues("join_request").Inc()

	// Notify home that a user has requested to join
	fromID := userID
	_ = s.notifSvc.CreateHomeNotification(ctx, &fromID, home.ID, "A user has requested to join the home")
	_ = s.notifSvc.Create(ctx, nil, userID, &home.ID, "Join request sent. Waiting for admin approval.")

	event.SendHomeEvent(ctx, s.cache, home.ID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionMemberJoined,
		Data:   map[string]int{"homeID": home.ID, "userID": userID},
	})

	return nil
}

func (s *Service) GetHomeByID(ctx context.Context, id int) (*models.Home, error) {
	key := utils.GetHomeCacheKey(id)
	// if in cache => returns from cache
	cached, err := utils.GetFromCache[models.Home](ctx, key, s.cache)
	if cached != nil && err == nil {
		return cached, nil
	}

	// if not in cache => returns from db
	home, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if home == nil {
		return nil, errors.New("home not found")
	}

	// saves to cache
	if err := utils.WriteToCache(ctx, key, home, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return home, nil
}

func (s *Service) DeleteHome(ctx context.Context, id int) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	metrics.HomesTotal.Dec()
	metrics.HomeOperationsTotal.WithLabelValues("delete").Inc()

	// remove from cache
	key := utils.GetHomeCacheKey(id)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	event.SendHomeEvent(ctx, s.cache, id, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionDeleted,
		Data:   map[string]int{"id": id},
	})

	return nil
}

func (s *Service) LeaveHome(ctx context.Context, homeID int, userID int) error {
	key := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := s.repo.DeleteMember(ctx, homeID, userID); err != nil {
		return err
	}

	metrics.HomeOperationsTotal.WithLabelValues("leave").Inc()

	// invalidate user homes list cache
	if err := utils.DeleteFromCache(ctx, utils.GetUserHomesKey(userID), s.cache); err != nil {
		logger.Info.Printf("Failed to delete user homes cache: %v", err)
	}

	// Notify home that a member left
	fromID := userID
	_ = s.notifSvc.CreateHomeNotification(ctx, &fromID, homeID, "A member has left the home")

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionMemberLeft,
		Data:   map[string]int{"homeID": homeID, "userID": userID},
	})

	return nil
}

func (s *Service) RemoveMember(ctx context.Context, homeID int, userID int, currentUserID int) error {
	if userID == currentUserID {
		return errors.New("you cannot remove yourself")
	}

	key := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := s.repo.DeleteMember(ctx, homeID, userID); err != nil {
		return err
	}

	metrics.HomeOperationsTotal.WithLabelValues("remove_member").Inc()

	// invalidate removed user's homes list cache
	if err := utils.DeleteFromCache(ctx, utils.GetUserHomesKey(userID), s.cache); err != nil {
		logger.Info.Printf("Failed to delete user homes cache: %v", err)
	}

	// Notify the removed user
	fromID := currentUserID
	_ = s.notifSvc.Create(ctx, &fromID, userID, &homeID, "You have been removed from a home")
	// Notify home that a member was removed
	_ = s.notifSvc.CreateHomeNotification(ctx, &fromID, homeID, "A member has been removed from the home")

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionMemberRemoved,
		Data:   map[string]int{"homeID": homeID, "userID": userID},
	})

	return nil
}

func (s *Service) GetMembers(ctx context.Context, homeID int) ([]models.HomeMembership, error) {
	return s.repo.GetMembers(ctx, homeID)
}

func (s *Service) GetUserHome(ctx context.Context, userID int) (*models.Home, error) {
	key := utils.GetUserHomeKey(userID)
	cached, err := utils.GetFromCache[models.Home](ctx, key, s.cache)
	if cached != nil && err == nil {
		return cached, nil
	}

	home, err := s.repo.GetUserHome(ctx, userID)
	if err != nil {
		return nil, err
	}
	if home == nil {
		return nil, errors.New("home not found")
	}

	if err := utils.WriteToCache(ctx, key, home, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	return home, nil
}

func (s *Service) GetUserHomes(ctx context.Context, userID int) ([]models.Home, error) {
	key := utils.GetUserHomesKey(userID)
	cached, err := utils.GetFromCache[[]models.Home](ctx, key, s.cache)
	if cached != nil && err == nil {
		return *cached, nil
	}

	homes, err := s.repo.GetUserHomes(ctx, userID)
	if err != nil {
		return nil, err
	}

	if err := utils.WriteToCache(ctx, key, homes, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return homes, nil
}

func (s *Service) ApproveMember(ctx context.Context, homeID int, userID int) error {
	if err := s.repo.ApproveMember(ctx, homeID, userID); err != nil {
		return err
	}

	key := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := utils.DeleteFromCache(ctx, utils.GetUserHomesKey(userID), s.cache); err != nil {
		logger.Info.Printf("Failed to delete user homes cache: %v", err)
	}

	if err := utils.DeleteFromCache(ctx, utils.GetUserHomeKey(userID), s.cache); err != nil {
		logger.Info.Printf("Failed to delete user home cache: %v", err)
	}

	metrics.HomeOperationsTotal.WithLabelValues("approve_member").Inc()

	_ = s.notifSvc.Create(ctx, nil, userID, &homeID, "Your request to join the home has been approved")
	_ = s.notifSvc.CreateHomeNotification(ctx, nil, homeID, "A new member has been approved")

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionMemberJoined,
		Data:   map[string]int{"homeID": homeID, "userID": userID},
	})

	return nil
}

func (s *Service) RejectMember(ctx context.Context, homeID int, userID int) error {
	if err := s.repo.RejectMember(ctx, homeID, userID); err != nil {
		return err
	}

	key := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	metrics.HomeOperationsTotal.WithLabelValues("reject_member").Inc()

	_ = s.notifSvc.Create(ctx, nil, userID, &homeID, "Your request to join the home has been rejected")

	return nil
}

func (s *Service) GetPendingMembers(ctx context.Context, homeID int) ([]models.HomeMembership, error) {
	return s.repo.GetPendingMembers(ctx, homeID)
}

func (s *Service) UpdateMemberRole(ctx context.Context, homeID int, userID int, role string) error {
	if err := s.repo.UpdateMemberRole(ctx, homeID, userID, role); err != nil {
		return err
	}

	homeKey := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, homeKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", homeKey, err)
	}

	userHomesKey := utils.GetUserHomesKey(userID)
	if err := utils.DeleteFromCache(ctx, userHomesKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", userHomesKey, err)
	}

	userHomeKey := utils.GetUserHomeKey(userID)
	if err := utils.DeleteFromCache(ctx, userHomeKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", userHomeKey, err)
	}

	metrics.HomeOperationsTotal.WithLabelValues("update_role").Inc()

	_ = s.notifSvc.Create(ctx, nil, userID, &homeID, "Your role has been updated to "+role)

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionUpdated,
		Data:   map[string]interface{}{"homeID": homeID, "userID": userID, "role": role},
	})

	return nil
}

// UpdateHome patches a home's name and/or currency in a single call - whichever
// fields are set on req. At least one of Name/Currency must be provided.
func (s *Service) UpdateHome(ctx context.Context, homeID int, req models.UpdateHomeRequest) error {
	if req.Name == nil && req.Currency == nil {
		return errors.New("at least one field (name or currency) is required")
	}

	fields := map[string]interface{}{}
	eventData := map[string]interface{}{"homeID": homeID}

	if req.Name != nil {
		normalizedName := strings.TrimSpace(*req.Name)
		if normalizedName == "" {
			return errors.New("name is required")
		}
		fields["name"] = normalizedName
		eventData["name"] = normalizedName
	}

	if req.Currency != nil {
		normalizedCurrency := strings.ToUpper(strings.TrimSpace(*req.Currency))
		if normalizedCurrency == "" {
			return errors.New("currency is required")
		}
		fields["currency"] = normalizedCurrency
		eventData["currency"] = normalizedCurrency
	}

	if err := s.repo.Update(ctx, homeID, fields); err != nil {
		return err
	}

	homeKey := utils.GetHomeCacheKey(homeID)
	if err := utils.DeleteFromCache(ctx, homeKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", homeKey, err)
	}
	if _, ok := fields["currency"]; ok {
		currencyKey := utils.GetHomeCurrencyKey(homeID)
		if err := utils.DeleteFromCache(ctx, currencyKey, s.cache); err != nil {
			logger.Info.Printf("Failed to delete redis cache for key %s: %v", currencyKey, err)
		}
	}

	members, err := s.repo.GetMembers(ctx, homeID)
	if err == nil {
		for _, member := range members {
			userHomesKey := utils.GetUserHomesKey(member.UserID)
			if deleteErr := utils.DeleteFromCache(ctx, userHomesKey, s.cache); deleteErr != nil {
				logger.Info.Printf("Failed to delete redis cache for key %s: %v", userHomesKey, deleteErr)
			}
			userHomeKey := utils.GetUserHomeKey(member.UserID)
			if deleteErr := utils.DeleteFromCache(ctx, userHomeKey, s.cache); deleteErr != nil {
				logger.Info.Printf("Failed to delete redis cache for key %s: %v", userHomeKey, deleteErr)
			}
		}
	}

	metrics.HomeOperationsTotal.WithLabelValues("update_home").Inc()

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHome,
		Action: event.ActionUpdated,
		Data:   eventData,
	})

	return nil
}

func (s *Service) GetHomeCurrency(ctx context.Context, homeID int) (string, error) {
	cacheKey := utils.GetHomeCurrencyKey(homeID)
	cached, err := utils.GetFromCache[string](ctx, cacheKey, s.cache)

	if cached != nil && err == nil {
		return *cached, nil
	}

	return s.repo.GetCurrency(ctx, homeID)

}
