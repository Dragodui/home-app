package models

import (
	"time"

	"gorm.io/datatypes"
)

type AuditEvent struct {
	ID          int            `gorm:"autoIncrement;primaryKey" json:"id"`
	HomeID      *int           `gorm:"index" json:"home_id,omitempty"`
	ActorUserID *int           `gorm:"index" json:"actor_user_id,omitempty"`
	EventType   string         `gorm:"size:80;not null;index" json:"event_type"`
	EntityType  string         `gorm:"size:80;not null;index" json:"entity_type"`
	EntityID    *int           `gorm:"index" json:"entity_id,omitempty"`
	Metadata    datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	IP          string         `gorm:"size:64" json:"ip,omitempty"`
	UserAgent   string         `gorm:"size:512" json:"user_agent,omitempty"`
	CreatedAt   time.Time      `gorm:"autoCreateTime;index" json:"created_at"`

	Home      *Home `gorm:"foreignKey:HomeID;constraint:OnDelete:SET NULL" json:"home,omitempty"`
	ActorUser *User `gorm:"foreignKey:ActorUserID;constraint:OnDelete:SET NULL" json:"actor_user,omitempty"`
}
