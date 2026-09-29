package audit

import (
	"context"
	"encoding/json"

	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"gorm.io/datatypes"
)

const (
	EventLogin            = "auth.login"
	EventLogout           = "auth.logout"
	EventOAuthLogin       = "auth.oauth_login"
	EventPasswordChanged  = "auth.password_changed"
	EventInviteRegenerate = "home.invite_regenerated"
	EventHomeDeleted      = "home.deleted"
	EventMemberLeft       = "home.member_left"
	EventMemberRemoved    = "home.member_removed"
	EventMemberApproved   = "home.member_approved"
	EventMemberRejected   = "home.member_rejected"
	EventRoleUpdated      = "home.role_updated"
	EventHomeUpdated      = "home.updated"
)

type Record struct {
	HomeID      *int
	ActorUserID *int
	EventType   string
	EntityType  string
	EntityID    *int
	Metadata    map[string]any
	IP          string
	UserAgent   string
}

type IService interface {
	Record(ctx context.Context, record Record) error
	RecordBestEffort(ctx context.Context, record Record)
	GetByHomeID(ctx context.Context, homeID, limit int) ([]models.AuditEvent, error)
	GetByActorID(ctx context.Context, actorUserID, limit int) ([]models.AuditEvent, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Record(ctx context.Context, record Record) error {
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

func (s *Service) RecordBestEffort(ctx context.Context, record Record) {
	if s == nil {
		return
	}
	if err := s.Record(ctx, record); err != nil {
		logger.Info.Printf("Failed to record audit event %s: %v", record.EventType, err)
	}
}

func (s *Service) GetByHomeID(ctx context.Context, homeID, limit int) ([]models.AuditEvent, error) {
	return s.repo.FindByHomeID(ctx, homeID, clampAuditLimit(limit))
}

func (s *Service) GetByActorID(ctx context.Context, actorUserID, limit int) ([]models.AuditEvent, error) {
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
