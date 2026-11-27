package database

import (
	"github.com/Dragodui/diploma-server/internal/models"
	"gorm.io/gorm"
)

// Models lists every GORM model, parents before children, so tables can be
// created and filled in this order without breaking foreign keys.
func Models() []any {
	return []any{
		&models.User{},
		&models.Home{},
		&models.HomeMembership{},
		&models.Task{},
		&models.TaskAssignment{},
		&models.TaskSchedule{},
		&models.Bill{},
		&models.BillSchedule{},
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
		&models.NoteCategory{},
		&models.Note{},
		&models.ChatMessage{},
		&models.ChatMessageRead{},
	}
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(Models()...)
}
