package testutil

import (
	"context"

	"github.com/Dragodui/diploma-server/internal/models"
)

// MockNotificationService is a no-op notification.IService.
type MockNotificationService struct{}

func (m *MockNotificationService) Create(ctx context.Context, from *int, to int, homeID *int, description string) error {
	return nil
}
func (m *MockNotificationService) GetByUserID(ctx context.Context, userID int, homeID *int) ([]models.Notification, error) {
	return nil, nil
}
func (m *MockNotificationService) MarkAsRead(ctx context.Context, notificationID, userID int) error {
	return nil
}
func (m *MockNotificationService) CreateHomeNotification(ctx context.Context, from *int, homeID int, description string) error {
	return nil
}
func (m *MockNotificationService) GetByHomeID(ctx context.Context, homeID int) ([]models.HomeNotification, error) {
	return nil, nil
}
func (m *MockNotificationService) MarkAsReadForHomeNotification(ctx context.Context, notificationID, homeID int) error {
	return nil
}
