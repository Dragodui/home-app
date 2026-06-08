package models

import (
	"time"

	"gorm.io/datatypes"
)

type BillSchedule struct {
	ID             int            `gorm:"autoIncrement;primaryKey" json:"id"`
	HomeID         int            `gorm:"not null;index" json:"home_id"`
	BillCategoryID *int           `json:"bill_category_id"`
	Public         bool           `gorm:"not null" json:"public"`
	Type           string         `gorm:"not null;size:128" json:"type"`
	Description    string         `json:"description"`
	ReceiptImage   *string        `json:"receipt_image"`
	TotalAmount    float64        `gorm:"not null" json:"total_amount"`
	UploadedBy     int            `gorm:"not null" json:"uploaded_by"`
	OCRData        datatypes.JSON `json:"ocr_data"`
	SplitsData     datatypes.JSON `json:"splits_data"`
	RecurrenceType string         `gorm:"not null;size:32" json:"recurrence_type"` // daily, weekly, monthly
	RecurrenceDay  *int           `json:"recurrence_day"`                          // weekly: 0-6, monthly: 1-31
	NextRunDate    time.Time      `gorm:"not null;index" json:"next_run_date"`
	IsActive       bool           `gorm:"not null;default:true" json:"is_active"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`

	Home         *Home         `gorm:"foreignKey:HomeID;constraint:OnDelete:CASCADE" json:"home,omitempty"`
	User         *User         `gorm:"foreignKey:UploadedBy;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	BillCategory *BillCategory `gorm:"foreignKey:BillCategoryID;constraint:OnDelete:SET NULL" json:"bill_category,omitempty"`
}
