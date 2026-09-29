package task

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/modules/notification"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type IScheduleService interface {
	CreateSchedule(ctx context.Context, taskID, homeID int, recurrenceType string, userIDs []int) (*models.TaskSchedule, error)
	GetScheduleByTaskID(ctx context.Context, taskID int) (*models.TaskSchedule, error)
	GetSchedulesByHomeID(ctx context.Context, homeID int) ([]models.TaskSchedule, error)
	DeleteSchedule(ctx context.Context, scheduleID int) error
	ProcessDueSchedules(ctx context.Context) error
}

type ScheduleService struct {
	repo     ScheduleRepository
	taskRepo Repository
	cache    *redis.Client
	notifSvc notification.IService
}

func NewScheduleService(repo ScheduleRepository, taskRepo Repository, cache *redis.Client, notifSvc notification.IService) *ScheduleService {
	return &ScheduleService{repo: repo, taskRepo: taskRepo, cache: cache, notifSvc: notifSvc}
}

func (s *ScheduleService) CreateSchedule(ctx context.Context, taskID, homeID int, recurrenceType string, userIDs []int) (*models.TaskSchedule, error) {
	if len(userIDs) == 0 {
		return nil, errors.New("at least one user is required")
	}

	validTypes := map[string]bool{"daily": true, "weekly": true, "monthly": true}
	if !validTypes[recurrenceType] {
		return nil, errors.New("recurrence_type must be daily, weekly, or monthly")
	}

	// Check task exists
	task, err := s.taskRepo.FindByID(ctx, taskID)
	if err != nil || task == nil {
		return nil, errors.New("task not found")
	}

	// Check no existing schedule
	existing, err := s.repo.FindByTaskID(ctx, taskID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("schedule already exists for this task")
	}

	userIDsJSON, err := json.Marshal(userIDs)
	if err != nil {
		return nil, err
	}

	nextRun := calcNextRunDate(time.Now(), recurrenceType)

	schedule := &models.TaskSchedule{
		TaskID:               taskID,
		RecurrenceType:       recurrenceType,
		RotationUserIDs:      string(userIDsJSON),
		CurrentRotationIndex: 0,
		NextRunDate:          nextRun,
		IsActive:             true,
	}

	if err := s.repo.Create(ctx, schedule); err != nil {
		return nil, err
	}

	// Assign the first user immediately
	firstUserID := userIDs[0]
	if err := s.taskRepo.AssignUser(ctx, taskID, firstUserID, time.Now()); err != nil {
		logger.Info.Printf("Failed to assign first rotation user: %v", err)
	}

	// Notify the first user
	_ = s.notifSvc.Create(ctx, nil, firstUserID, &homeID, "You have been assigned to scheduled task: "+task.Name)

	// Invalidate caches
	s.invalidateTaskCaches(ctx, taskID, homeID)

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleTask,
		Action: event.ActionUpdated,
		Data:   map[string]interface{}{"schedule": schedule, "task_id": taskID},
	})

	return schedule, nil
}

func (s *ScheduleService) GetScheduleByTaskID(ctx context.Context, taskID int) (*models.TaskSchedule, error) {
	return s.repo.FindByTaskID(ctx, taskID)
}

func (s *ScheduleService) GetSchedulesByHomeID(ctx context.Context, homeID int) ([]models.TaskSchedule, error) {
	return s.repo.FindByHomeID(ctx, homeID)
}

func (s *ScheduleService) DeleteSchedule(ctx context.Context, scheduleID int) error {
	schedule, err := s.repo.FindByID(ctx, scheduleID)
	if err != nil {
		return err
	}
	if schedule == nil {
		return errors.New("schedule not found")
	}

	homeID := 0
	if schedule.Task != nil {
		homeID = schedule.Task.HomeID
	}

	if err := s.repo.Delete(ctx, scheduleID); err != nil {
		return err
	}

	if homeID > 0 {
		s.invalidateTaskCaches(ctx, schedule.TaskID, homeID)
	}

	return nil
}

// ProcessDueSchedules finds all schedules where NextRunDate <= now and creates the next assignment
func (s *ScheduleService) ProcessDueSchedules(ctx context.Context) error {
	now := time.Now()
	schedules, err := s.repo.FindDueSchedules(ctx, now)
	if err != nil {
		return err
	}

	for i := range schedules {
		schedule := &schedules[i]

		var userIDs []int
		if err := json.Unmarshal([]byte(schedule.RotationUserIDs), &userIDs); err != nil {
			logger.Info.Printf("[Scheduler] Failed to parse user IDs for schedule %d: %v", schedule.ID, err)
			continue
		}

		if len(userIDs) == 0 {
			continue
		}

		// Get the next user in rotation
		nextUserID := userIDs[schedule.CurrentRotationIndex%len(userIDs)]

		// Create assignment for this user
		if err := s.taskRepo.AssignUser(ctx, schedule.TaskID, nextUserID, now); err != nil {
			logger.Info.Printf("[Scheduler] Failed to assign user %d to task %d: %v", nextUserID, schedule.TaskID, err)
			continue
		}

		// Notify the user about their rotation assignment
		taskName := ""
		var scheduleHomeID *int
		if schedule.Task != nil {
			taskName = schedule.Task.Name
			scheduleHomeID = &schedule.Task.HomeID
		}
		_ = s.notifSvc.Create(ctx, nil, nextUserID, scheduleHomeID, "It's your turn! You've been assigned to task: "+taskName)

		// Update rotation index and next run date
		schedule.CurrentRotationIndex = (schedule.CurrentRotationIndex + 1) % len(userIDs)
		schedule.NextRunDate = calcNextRunDate(schedule.NextRunDate, schedule.RecurrenceType)

		// Roll the task's own due date forward to the new cycle so it shows up as
		// freshly due again in the task list, instead of keeping a stale due date
		// from whenever the schedule was first created.
		if schedule.Task != nil {
			nextDue := schedule.NextRunDate
			schedule.Task.DueDate = &nextDue
			if err := s.taskRepo.Update(ctx, schedule.Task); err != nil {
				logger.Info.Printf("[Scheduler] Failed to roll due date for task %d: %v", schedule.TaskID, err)
			}
		}

		if err := s.repo.Update(ctx, schedule); err != nil {
			logger.Info.Printf("[Scheduler] Failed to update schedule %d: %v", schedule.ID, err)
			continue
		}

		// Invalidate caches
		homeID := 0
		if schedule.Task != nil {
			homeID = schedule.Task.HomeID
		}
		if homeID > 0 {
			s.invalidateTaskCaches(ctx, schedule.TaskID, homeID)
		}

		// Send real-time event
		event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
			Module: event.ModuleTask,
			Action: event.ActionAssigned,
			Data:   map[string]interface{}{"task_id": schedule.TaskID, "user_id": nextUserID, "scheduled": true},
		})

		logger.Info.Printf("[Scheduler] Assigned user %d to task %d (rotation %d/%d)", nextUserID, schedule.TaskID, schedule.CurrentRotationIndex, len(userIDs))
	}

	return nil
}

func (s *ScheduleService) invalidateTaskCaches(ctx context.Context, taskID, homeID int) {
	taskKey := utils.GetTaskKey(taskID)
	if err := utils.DeleteFromCache(ctx, taskKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete cache for key %s: %v", taskKey, err)
	}
	homeTasksKey := utils.GetTasksForHomeKey(homeID)
	if err := utils.DeleteFromCache(ctx, homeTasksKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete cache for key %s: %v", homeTasksKey, err)
	}
}

func calcNextRunDate(from time.Time, recurrenceType string) time.Time {
	switch recurrenceType {
	case "daily":
		return from.Add(24 * time.Hour)
	case "weekly":
		return from.Add(7 * 24 * time.Hour)
	case "monthly":
		return from.AddDate(0, 1, 0)
	default:
		return from.Add(24 * time.Hour)
	}
}
