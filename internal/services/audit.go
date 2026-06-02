package services

import (
	"context"
	"encoding/json"

	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"gorm.io/datatypes"
)

const (
	AuditEventLogin            = "auth.login"
	AuditEventLogout           = "auth.logout"
	AuditEventOAuthLogin       = "auth.oauth_login"
	AuditEventPasswordChanged  = "auth.password_changed"
	AuditEventInviteRegenerate = "home.invite_regenerated"
	AuditEventHomeDeleted      = "home.deleted"
	AuditEventMemberLeft       = "home.member_left"
	AuditEventMemberRemoved    = "home.member_removed"
	AuditEventMemberApproved   = "home.member_approved"
	AuditEventMemberRejected   = "home.member_rejected"
	AuditEventRoleUpdated      = "home.role_updated"
	AuditEventCurrencyUpdated  = "home.currency_updated"
)

type AuditRecord struct {
	HomeID      *int
	ActorUserID *int
	EventType   string
	EntityType  string
	EntityID    *int
	Metadata    map[string]any
	IP          string
	UserAgent   string
}

type IAuditService interface {
	Record(ctx context.Context, record AuditRecord) error
	RecordBestEffort(ctx context.Context, record AuditRecord)
	GetByHomeID(ctx context.Context, homeID, limit int) ([]models.AuditEvent, error)
	GetByActorID(ctx context.Context, actorUserID, limit int) ([]models.AuditEvent, error)
}

type AuditService struct {
	repo repository.AuditRepository
}

func NewAuditService(repo repository.AuditRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Record(ctx context.Context, record AuditRecord) error {
	metadata, err := marshalAuditMetadata(record.Metadata)
	if err != nil {
		return err
	}

	return s.repo.Create(ctx, &models.AuditEvent{
		HomeID:      record.HomeID,
		ActorUserID: record.ActorUserID,
		EventType:   record.EventType,
		EntityType:  record.EntityType,
		EntityID:    record.EntityID,
		Metadata:    metadata,
		IP:          record.IP,
		UserAgent:   record.UserAgent,
	})
}

func (s *AuditService) RecordBestEffort(ctx context.Context, record AuditRecord) {
	if s == nil {
		return
	}
	if err := s.Record(ctx, record); err != nil {
		logger.Info.Printf("Failed to record audit event %s: %v", record.EventType, err)
	}
}

func (s *AuditService) GetByHomeID(ctx context.Context, homeID, limit int) ([]models.AuditEvent, error) {
	return s.repo.FindByHomeID(ctx, homeID, clampAuditLimit(limit))
}

func (s *AuditService) GetByActorID(ctx context.Context, actorUserID, limit int) ([]models.AuditEvent, error) {
	return s.repo.FindByActorID(ctx, actorUserID, clampAuditLimit(limit))
}

func marshalAuditMetadata(metadata map[string]any) (datatypes.JSON, error) {
	if len(metadata) == 0 {
		return nil, nil
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(payload), nil
}

func clampAuditLimit(limit int) int {
	if limit <= 0 {
		return 100
	}
	if limit > 500 {
		return 500
	}
	return limit
}
