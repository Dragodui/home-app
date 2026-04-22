package services

import (
	"context"
	"fmt"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type NotificationService struct {
	repo     repository.NotificationRepository
	cache    *redis.Client
	pushSvc  *PushSubscriptionService
	homeRepo repository.HomeRepository
}

type INotificationService interface {
	// user notifications
	Create(ctx context.Context, from *int, to int, description string) error
	GetByUserID(ctx context.Context, userID int) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, notificationID, userID int) error

	// home notifications
	CreateHomeNotification(ctx context.Context, from *int, homeID int, description string) error
	GetByHomeID(ctx context.Context, homeID int) ([]models.HomeNotification, error)
	MarkAsReadForHomeNotification(ctx context.Context, notificationID, homeID int) error
}

func NewNotificationService(repo repository.NotificationRepository, cache *redis.Client, pushSvc *PushSubscriptionService, homeRepo repository.HomeRepository) *NotificationService {
	return &NotificationService{repo: repo, cache: cache, pushSvc: pushSvc, homeRepo: homeRepo}
}

func (s *NotificationService) Create(ctx context.Context, from *int, to int, description string) error {
	// remove from cache
	key := utils.GetUserNotificationsKey(to)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	notification := &models.Notification{
		From:        from,
		To:          to,
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

func (s *NotificationService) GetByUserID(ctx context.Context, userID int) ([]models.Notification, error) {
	key := utils.GetUserNotificationsKey(userID)
	cached, err := utils.GetFromCache[[]models.Notification](ctx, key, s.cache)
	if cached != nil && err == nil {
		return *cached, err
	}

	notifications, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if err := utils.WriteToCache(ctx, key, notifications, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return notifications, err
}

func (s *NotificationService) MarkAsRead(ctx context.Context, notificationID, userID int) error {
	key := utils.GetUserNotificationsKey(userID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if err := s.repo.MarkAsRead(ctx, notificationID); err != nil {
		return err
	}

	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", userID), &event.RealTimeEvent{
		Module: event.ModuleNotification,
		Action: event.ActionMarkRead,
		Data:   map[string]int{"id": notificationID},
	})

	return nil
}

func (s *NotificationService) CreateHomeNotification(ctx context.Context, from *int, homeID int, description string) error {
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

func (s *NotificationService) GetByHomeID(ctx context.Context, homeID int) ([]models.HomeNotification, error) {
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

func (s *NotificationService) MarkAsReadForHomeNotification(ctx context.Context, notificationID, homeID int) error {
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
