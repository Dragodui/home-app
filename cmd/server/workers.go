package main

import (
	"context"
	"database/sql"
	"time"

	"github.com/Dragodui/diploma-server/internal/modules/billing"
	"github.com/Dragodui/diploma-server/internal/modules/task"

	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/metrics"
)

func runTaskScheduler(svc *task.ScheduleService) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		ctx := context.Background()
		if err := svc.ProcessDueSchedules(ctx); err != nil {
			logger.Info.Printf("[Scheduler] Error processing due schedules: %v", err)
		}
	}
}

func runTaskReminderScheduler(svc *task.Service) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		ctx := context.Background()
		if err := svc.ProcessTaskReminders(ctx); err != nil {
			logger.Info.Printf("[TaskReminderScheduler] Error processing reminders: %v", err)
		}
	}
}

func runBillScheduler(svc *billing.Service) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		ctx := context.Background()
		if err := svc.ProcessDueSchedules(ctx); err != nil {
			logger.Info.Printf("[BillScheduler] Error processing due schedules: %v", err)
		}
	}
}

func collectDBPoolStats(sqlDB *sql.DB) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		stats := sqlDB.Stats()
		metrics.DbConnectionsOpen.Set(float64(stats.OpenConnections))
		metrics.DbConnectionsInUse.Set(float64(stats.InUse))
	}
}
