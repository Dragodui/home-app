package notification

import (
	"context"
	"fmt"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	repo     Repository
	cache    *redis.Client
	pushSvc  *PushService
	homeRepo HomeMembersGetter
}

// HomeMembersGetter is the subset of the home repository used to fan out push notifications.
type HomeMembersGetter interface {
	GetMembers(ctx context.Context, homeID int) ([]models.HomeMembership, error)
}

type IService interface {
	// user notifications
	Create(ctx context.Context, from *int, to int, homeID *int, description string) error
	// GetByUserID returns the user's notifications, optionally scoped to a single home
	// (pass nil to get notifications across every home the user belongs to).
	GetByUserID(ctx context.Context, userID int, homeID *int) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, notificationID, userID int) error

	// home notifications
	CreateHomeNotification(ctx context.Context, from *int, homeID int, description string) error
	GetByHomeID(ctx context.Context, homeID int) ([]models.HomeNotification, error)
	MarkAsReadForHomeNotification(ctx context.Context, notificationID, homeID int) error
}

func NewService(repo Repository, cache *redis.Client, pushSvc *PushService, homeRepo HomeMembersGetter) *Service {
	return &Service{repo: repo, cache: cache, pushSvc: pushSvc, homeRepo: homeRepo}
}

func (s *Service) Create(ctx context.Context, from *int, to int, homeID *int, description string) error {
	// remove from cache: the scoped view for this home, and the unscoped "all homes" view
	if err := utils.DeleteFromCache(ctx, utils.GetUserNotificationsKey(to, homeID), s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for user %d notifications: %v", to, err)
	}
	if homeID != nil {
		if err := utils.DeleteFromCache(ctx, utils.GetUserNotificationsKey(to, nil), s.cache); err != nil {
			logger.Info.Printf("Failed to delete redis cache for user %d notifications: %v", to, err)
		}
	}

	notification := &models.Notification{
		From:        from,
		To:          to,
		HomeID:      homeID,
		Description: description,
	}
	if err := s.repo.Create(ctx, notification); err != nil {
		return err
	}
	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", to), &event.RealTimeEvent{
		Module: event.ModuleNotification,
		Action: event.ActionCreated,
		Data:   notification,
	})

	if s.pushSvc != nil {
		go func() {
			_ = s.pushSvc.SendPushNotification(context.Background(), to, "New Notification", description)
		}()
	}

	return nil
}

func (s *Service) GetByUserID(ctx context.Context, userID int, homeID *int) ([]models.Notification, error) {
	key := utils.GetUserNotificationsKey(userID, homeID)
	cached, err := utils.GetFromCache[[]models.Notification](ctx, key, s.cache)
	if cached != nil && err == nil {
		return *cached, err
	}

	notifications, err := s.repo.FindByUserID(ctx, userID, homeID)
	if err != nil {
		return nil, err
	}

	if err := utils.WriteToCache(ctx, key, notifications, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return notifications, err
}

func (s *Service) MarkAsRead(ctx context.Context, notificationID, userID int) error {
	notification, err := s.repo.MarkAsRead(ctx, notificationID)
	if err != nil {
		return err
	}

	// invalidate the unscoped "all homes" view and, if this notification belongs to a
	// home, that home's scoped view too
	if err := utils.DeleteFromCache(ctx, utils.GetUserNotificationsKey(userID, nil), s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for user %d notifications: %v", userID, err)
	}
	if notification.HomeID != nil {
		if err := utils.DeleteFromCache(ctx, utils.GetUserNotificationsKey(userID, notification.HomeID), s.cache); err != nil {
			logger.Info.Printf("Failed to delete redis cache for user %d notifications: %v", userID, err)
		}
	}

	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", userID), &event.RealTimeEvent{
		Module: event.ModuleNotification,
		Action: event.ActionMarkRead,
		Data:   map[string]int{"id": notificationID},
	})

	return nil
}

func (s *Service) CreateHomeNotification(ctx context.Context, from *int, homeID int, description string) error {
	key := utils.GetHomeNotificationsKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	notification := &models.HomeNotification{
		From:        from,
		HomeID:      homeID,
		Description: description,
	}
	if err := s.repo.CreateHomeNotification(ctx, notification); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHomeNotification,
		Action: event.ActionCreated,
		Data:   notification,
	})

	// send push notifications to all approved home members
	if s.pushSvc != nil && s.homeRepo != nil {
		go func() {
			members, err := s.homeRepo.GetMembers(context.Background(), homeID)
			if err != nil {
				logger.Info.Printf("Failed to get home members for push: %v", err)
				return
			}
			for _, m := range members {
				if m.UserID == 0 {
					continue
				}
				_ = s.pushSvc.SendPushNotification(context.Background(), m.UserID, "Home Notification", description)
			}
		}()
	}

	return nil
}

func (s *Service) GetByHomeID(ctx context.Context, homeID int) ([]models.HomeNotification, error) {
	key := utils.GetHomeNotificationsKey(homeID)
	cached, err := utils.GetFromCache[[]models.HomeNotification](ctx, key, s.cache)
	if cached != nil && err == nil {
		return *cached, err
	}

	notifications, err := s.repo.FindByHomeID(ctx, homeID)
	if err != nil {
		return nil, err
	}

	if err := utils.WriteToCache(ctx, key, notifications, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return notifications, err
}

func (s *Service) MarkAsReadForHomeNotification(ctx context.Context, notificationID, homeID int) error {
	key := utils.GetHomeNotificationsKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := s.repo.MarkAsReadForHomeNotification(ctx, notificationID); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleHomeNotification,
		Action: event.ActionMarkRead,
		Data:   map[string]int{"id": notificationID},
	})

	return nil
}
