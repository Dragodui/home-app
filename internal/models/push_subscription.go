package models

import "time"

type PushSubscription struct {
	ID        int       `gorm:"autoIncrement;primaryKey" json:"id"`
	UserID    int       `gorm:"not null;index" json:"user_id"`
	Endpoint  string    `gorm:"not null;uniqueIndex" json:"endpoint"`
	P256dh    string    `gorm:"not null" json:"p256dh"`
	Auth      string    `gorm:"not null" json:"auth"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

type PushSubscriptionInput struct {
	Endpoint string `json:"endpoint" validate:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" validate:"required"`
		Auth   string `json:"auth" validate:"required"`
	} `json:"keys" validate:"required"`
}
