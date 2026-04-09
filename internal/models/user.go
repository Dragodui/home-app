package models

import "time"

type RegisterInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required,min=3"`
	Username string `json:"username" validate:"required,min=3,max=32"`
}

type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type Login struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type User struct {
	ID              int        `gorm:"autoIncrement; primaryKey" json:"id"`
	Email           string     `gorm:"size:64;not null;unique" json:"email"`
	EmailVerified   bool       `gorm:"default:false" json:"email_verified"`
	VerifyToken     *string    `json:"-"`
	VerifyExpiresAt *time.Time `json:"-"`
	ResetToken      *string    `json:"-"`
	ResetExpiresAt  *time.Time `json:"-"`
	Name            string     `gorm:"size:64;not null" json:"name"`
	Username        string     `gorm:"size:32;uniqueIndex" json:"username"`
	ProfilePublic   bool       `gorm:"default:true" json:"profile_public"`
	PasswordHash    string     `gorm:"not null" json:"-"`
	Avatar          string     `json:"avatar"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`

	// relations
	Memberships     []HomeMembership `gorm:"foreignKey:UserID" json:"memberships,omitempty"`
	TaskAssignments []TaskAssignment `gorm:"foreignKey:UserID" json:"task_assignments,omitempty"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Username string `json:"username"`
}

type UpdateUserAvatarRequest struct {
	Avatar string `json:"avatar"`
}

type GoogleSignInInput struct {
	AccessToken string `json:"access_token" validate:"required"`
}
