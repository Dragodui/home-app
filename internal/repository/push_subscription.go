package repository

import (
	"context"

	"github.com/Dragodui/diploma-server/internal/models"
	"gorm.io/gorm"
)

type PushSubscriptionRepository interface {
	Save(ctx context.Context, sub *models.PushSubscription) error
	FindByUserID(ctx context.Context, userID int) ([]models.PushSubscription, error)
	DeleteByEndpoint(ctx context.Context, endpoint string) error
}

type pushSubscriptionRepo struct {
	db *gorm.DB
}

func NewPushSubscriptionRepository(db *gorm.DB) PushSubscriptionRepository {
	return &pushSubscriptionRepo{db}
}

func (r *pushSubscriptionRepo) Save(ctx context.Context, sub *models.PushSubscription) error {
	// Use Save to insert or update based on Endpoint or ID
	// Since endpoint is unique, we can just do an Upsert if needed, or simple create
	var existing models.PushSubscription
	if err := r.db.WithContext(ctx).Where("endpoint = ?", sub.Endpoint).First(&existing).Error; err == nil {
		// update existing
		existing.UserID = sub.UserID
		existing.P256dh = sub.P256dh
		existing.Auth = sub.Auth
		return r.db.WithContext(ctx).Save(&existing).Error
	}
	return r.db.WithContext(ctx).Create(sub).Error
}

func (r *pushSubscriptionRepo) FindByUserID(ctx context.Context, userID int) ([]models.PushSubscription, error) {
	var subs []models.PushSubscription
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&subs).Error; err != nil {
		return nil, err
	}
	return subs, nil
}

func (r *pushSubscriptionRepo) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	return r.db.WithContext(ctx).Where("endpoint = ?", endpoint).Delete(&models.PushSubscription{}).Error
}
