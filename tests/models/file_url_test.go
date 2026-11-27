package models_test

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/Dragodui/diploma-server/internal/database"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// fakeResolver stores "ref:<x>" and gives clients "https://files/<x>?fresh".
type fakeResolver struct{}

func (fakeResolver) Resolve(s string) string {
	if x, ok := strings.CutPrefix(s, "ref:"); ok {
		return "https://files/" + x + "?fresh"
	}
	return s
}

func (fakeResolver) Normalize(s string) string {
	if x, ok := strings.CutPrefix(s, "https://files/"); ok {
		x, _, _ = strings.Cut(x, "?")
		return "ref:" + x
	}
	return s
}

func TestFileURLHooks(t *testing.T) {
	models.SetFileURLResolver(fakeResolver{})
	t.Cleanup(func() { models.SetFileURLResolver(nil) })

	db, err := database.Open(database.DriverSQLite, filepath.Join(t.TempDir(), "test.db"), &gorm.Config{})
	require.NoError(t, err)
	// test checks only hooks, so related rows (users, homes, categories) are not created
	require.NoError(t, db.Exec("PRAGMA foreign_keys = OFF").Error)
	require.NoError(t, db.AutoMigrate(&models.ShoppingItem{}, &models.ChatMessage{}))

	link := "https://files/receipt.png?old"
	item := models.ShoppingItem{Name: "milk", Image: &link}
	require.NoError(t, db.Create(&item).Error)
	// struct returned to client after create holds an openable link
	require.Equal(t, "https://files/receipt.png?fresh", *item.Image)

	// database keeps the reference, not the expiring link
	var raw string
	require.NoError(t, db.Raw("SELECT image FROM shopping_items WHERE id = ?", item.ID).Scan(&raw).Error)
	require.Equal(t, "ref:receipt.png", raw)

	// loaded model gets a fresh link
	var loaded models.ShoppingItem
	require.NoError(t, db.First(&loaded, item.ID).Error)
	require.Equal(t, "https://files/receipt.png?fresh", *loaded.Image)

	// saving a loaded model does not write the link back
	loaded.Name = "oat milk"
	require.NoError(t, db.Save(&loaded).Error)
	require.NoError(t, db.Raw("SELECT image FROM shopping_items WHERE id = ?", item.ID).Scan(&raw).Error)
	require.Equal(t, "ref:receipt.png", raw)

	// foreign URLs are stored unchanged
	external := "https://pub-1.r2.dev/old.jpg"
	msg := models.ChatMessage{HomeID: 1, CreatedBy: 1, Content: "hi", ImageURL: &external}
	require.NoError(t, db.Omit("Home", "Creator", "Recipient").Create(&msg).Error)
	require.NoError(t, db.Raw("SELECT image_url FROM chat_messages WHERE id = ?", msg.ID).Scan(&raw).Error)
	require.Equal(t, external, raw)
}
