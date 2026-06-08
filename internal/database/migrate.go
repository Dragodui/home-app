package database

import (
	"github.com/Dragodui/diploma-server/internal/models"
	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Home{},
		&models.HomeMembership{},
		&models.Task{},
		&models.TaskAssignment{},
		&models.TaskSchedule{},
		&models.Bill{},
		&models.BillCategory{},
		&models.BillSplit{},
		&models.ShoppingCategory{},
		&models.ShoppingItem{},
		&models.Poll{},
		&models.Option{},
		&models.Vote{},
		&models.Notification{},
		&models.HomeNotification{},
		&models.AuditEvent{},
		&models.Room{},
		&models.HomeAssistantConfig{},
		&models.SmartDevice{},
		&models.PushSubscription{},
	)
}
