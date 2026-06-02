package repository

import (
	"context"

	"github.com/Dragodui/diploma-server/internal/models"
	"gorm.io/gorm"
)

type AuditRepository interface {
	Create(ctx context.Context, event *models.AuditEvent) error
	FindByHomeID(ctx context.Context, homeID, limit int) ([]models.AuditEvent, error)
	FindByActorID(ctx context.Context, actorUserID, limit int) ([]models.AuditEvent, error)
}

type auditRepo struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepo{db: db}
}

func (r *auditRepo) Create(ctx context.Context, event *models.AuditEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
}

func (r *auditRepo) FindByHomeID(ctx context.Context, homeID, limit int) ([]models.AuditEvent, error) {
	var events []models.AuditEvent
	err := r.db.WithContext(ctx).
		Where("home_id = ?", homeID).
		Preload("ActorUser").
		Order("created_at DESC").
		Limit(limit).
		Find(&events).Error
	return events, err
}

func (r *auditRepo) FindByActorID(ctx context.Context, actorUserID, limit int) ([]models.AuditEvent, error) {
	var events []models.AuditEvent
	err := r.db.WithContext(ctx).
		Where("actor_user_id = ?", actorUserID).
		Preload("Home").
		Order("created_at DESC").
		Limit(limit).
		Find(&events).Error
	return events, err
}
