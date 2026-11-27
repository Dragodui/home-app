package task_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/Dragodui/diploma-server/internal/database"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/modules/task"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// FindAssignmentsNeedingReminder uses dialect-specific date arithmetic; this
// checks the SQLite branch against a real database file.
func TestRepository_FindAssignmentsNeedingReminder_SQLite(t *testing.T) {
	db, err := database.Open(database.DriverSQLite, filepath.Join(t.TempDir(), "test.db"),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(db))

	user := models.User{Email: "a@example.com", Name: "A", Username: "a"}
	require.NoError(t, db.Create(&user).Error)
	home := models.Home{Name: "Home", InviteCode: "INV1"}
	require.NoError(t, db.Create(&home).Error)

	now := time.Now()
	mkTask := func(name string, due time.Time, reminder int) models.TaskAssignment {
		tk := models.Task{HomeID: home.ID, CreatedBy: user.ID, Name: name, ScheduleType: "once", DueDate: &due, ReminderMinutes: reminder}
		require.NoError(t, db.Create(&tk).Error)
		a := models.TaskAssignment{TaskID: tk.ID, UserID: user.ID}
		require.NoError(t, db.Create(&a).Error)
		return a
	}

	// Reminder at now+1m: inside the (now, now+5m] window.
	inWindow := mkTask("in", now.Add(31*time.Minute), 30)
	// Reminder at now+60m: too late.
	mkTask("later", now.Add(90*time.Minute), 30)
	// Reminder at now-10m: already past.
	mkTask("past", now.Add(20*time.Minute), 30)

	repo := task.NewRepository(db)
	got, err := repo.FindAssignmentsNeedingReminder(context.Background(), now, now.Add(5*time.Minute))
	require.NoError(t, err)
	require.Len(t, got, 1)
	require.Equal(t, inWindow.ID, got[0].ID)
	require.NotNil(t, got[0].Task)
}
