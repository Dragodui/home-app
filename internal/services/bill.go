package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/metrics"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
	"gorm.io/datatypes"
)

type BillService struct {
	repo     repository.BillRepository
	cache    *redis.Client
	notifSvc INotificationService
	homeSvc  IHomeService
}

type IBillService interface {
	CreateBill(ctx context.Context, billType string, billCategoryID *int, public *bool, description string, receiptImage *string, totalAmount float64, start, end time.Time,
		ocrData datatypes.JSON, homeID, uploadedBy int, splits []models.SplitInput, isRegular bool, recurrenceType *string, recurrenceDay *int) error
	GetBillByID(ctx context.Context, id int) (*models.Bill, error)
	GetBillsByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Bill, error)
	GetPrivateBillsByUserID(ctx context.Context, homeID, userID int, categoryID *int) ([]models.Bill, error)
	UpdateBill(ctx context.Context, id int, billType *string, billCategoryID *int, public *bool, description, receiptImage *string, totalAmount *float64, start, end *time.Time, ocrData *datatypes.JSON) error
	Delete(ctx context.Context, id int) error
	MarkBillPayed(ctx context.Context, id int) error
	UpdateSplits(ctx context.Context, billID int, splits []models.SplitInput) error
	MarkSplitPaid(ctx context.Context, splitID int) error
	GetSplitByID(ctx context.Context, splitID int) (*models.BillSplit, error)
}

func NewBillService(repo repository.BillRepository, cache *redis.Client, notifSvc INotificationService, homeSvc IHomeService) *BillService {
	return &BillService{repo: repo, cache: cache, notifSvc: notifSvc, homeSvc: homeSvc}
}

func validateSplits(splits []models.SplitInput, totalAmount float64) error {
	var sum float64
	for _, sp := range splits {
		if sp.Amount <= 0 {
			return fmt.Errorf("split amount must be greater than 0")
		}
		sum += sp.Amount
	}
	if sum > totalAmount {
		return fmt.Errorf("total split amount (%.2f) exceeds bill total (%.2f)", sum, totalAmount)
	}
	return nil
}

func (s *BillService) CreateBill(ctx context.Context, billType string, billCategoryID *int, public *bool, description string, receiptImage *string, totalAmount float64, start, end time.Time,
	ocrData datatypes.JSON, homeID, uploadedBy int, splits []models.SplitInput, isRegular bool, recurrenceType *string, recurrenceDay *int) error {

	if len(splits) > 0 {
		if err := validateSplits(splits, totalAmount); err != nil {
			return err
		}
	}

	isPublic := true
	if public != nil {
		isPublic = *public
	}

	var schedule *models.BillSchedule
	if isRegular {
		if recurrenceType == nil {
			return errors.New("recurrence_type is required for regular bills")
		}
		nextRun, err := calcNextBillRunDate(time.Now(), *recurrenceType, recurrenceDay)
		if err != nil {
			return err
		}
		splitsData, err := json.Marshal(splits)
		if err != nil {
			return err
		}
		schedule = &models.BillSchedule{
			HomeID:         homeID,
			Public:         isPublic,
			UploadedBy:     uploadedBy,
			Type:           billType,
			BillCategoryID: billCategoryID,
			Description:    description,
			ReceiptImage:   receiptImage,
			TotalAmount:    totalAmount,
			OCRData:        ocrData,
			SplitsData:     datatypes.JSON(splitsData),
			RecurrenceType: *recurrenceType,
			RecurrenceDay:  recurrenceDay,
			NextRunDate:    nextRun,
			IsActive:       true,
		}
	}

	if err := s.createBillInstance(ctx, billType, billCategoryID, isPublic, description, receiptImage, totalAmount, start, end, ocrData, homeID, uploadedBy, splits, false); err != nil {
		return err
	}

	if schedule != nil {
		if err := s.repo.CreateSchedule(ctx, schedule); err != nil {
			return err
		}
	}

	return nil
}

func (s *BillService) createBillInstance(ctx context.Context, billType string, billCategoryID *int, isPublic bool, description string, receiptImage *string, totalAmount float64, start, end time.Time,
	ocrData datatypes.JSON, homeID, uploadedBy int, splits []models.SplitInput, scheduled bool) error {

	currency, err := s.homeSvc.GetHomeCurrency(ctx, homeID)
	if err != nil {
		return err
	}

	bill := &models.Bill{
		HomeID:         homeID,
		Public:         isPublic,
		UploadedBy:     uploadedBy,
		Type:           billType,
		BillCategoryID: billCategoryID,
		Description:    description,
		ReceiptImage:   receiptImage,
		TotalAmount:    totalAmount,
		Start:          start,
		End:            end,
		Payed:          false,
		OCRData:        ocrData,
		CreatedAt:      time.Now(),
	}

	if err := s.repo.Create(ctx, bill); err != nil {
		return err
	}

	// Create splits if provided
	if len(splits) > 0 {
		billSplits := make([]models.BillSplit, len(splits))
		for i, sp := range splits {
			billSplits[i] = models.BillSplit{
				UserID: sp.UserID,
				Amount: sp.Amount,
			}
		}
		if err := s.repo.CreateSplits(ctx, bill.ID, billSplits); err != nil {
			return err
		}
	}

	metrics.BillsTotal.Inc()
	metrics.BillOperationsTotal.WithLabelValues("create").Inc()

	if isPublic {
		fromID := uploadedBy
		desc := fmt.Sprintf("New expense added: %s(%.2f)", currency, totalAmount)
		if description != "" {
			desc = fmt.Sprintf("New expense added: %s %s(%.2f)", currency, description, totalAmount)
		}
		if scheduled {
			desc = "Scheduled " + desc
		}
		_ = s.notifSvc.CreateHomeNotification(ctx, &fromID, homeID, desc)

		event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
			Module: event.ModuleBill,
			Action: event.ActionCreated,
			Data:   bill,
		})
	}

	return nil
}

func (s *BillService) ProcessDueSchedules(ctx context.Context) error {
	now := time.Now()
	schedules, err := s.repo.FindDueSchedules(ctx, now)
	if err != nil {
		return err
	}

	for i := range schedules {
		schedule := &schedules[i]

		var splits []models.SplitInput
		if len(schedule.SplitsData) > 0 {
			if err := json.Unmarshal(schedule.SplitsData, &splits); err != nil {
				logger.Info.Printf("[BillScheduler] Failed to parse splits for schedule %d: %v", schedule.ID, err)
				continue
			}
		}

		start := now
		end := nextBillPeriodEnd(start, schedule.RecurrenceType)
		if err := s.createBillInstance(ctx, schedule.Type, schedule.BillCategoryID, schedule.Public, schedule.Description, schedule.ReceiptImage, schedule.TotalAmount, start, end, schedule.OCRData, schedule.HomeID, schedule.UploadedBy, splits, true); err != nil {
			logger.Info.Printf("[BillScheduler] Failed to create bill for schedule %d: %v", schedule.ID, err)
			continue
		}

		nextRun, err := calcNextBillRunDate(now, schedule.RecurrenceType, schedule.RecurrenceDay)
		if err != nil {
			logger.Info.Printf("[BillScheduler] Failed to calculate next run for schedule %d: %v", schedule.ID, err)
			continue
		}
		schedule.NextRunDate = nextRun
		if err := s.repo.UpdateSchedule(ctx, schedule); err != nil {
			logger.Info.Printf("[BillScheduler] Failed to update schedule %d: %v", schedule.ID, err)
			continue
		}
	}

	return nil
}

func (s *BillService) GetBillByID(ctx context.Context, id int) (*models.Bill, error) {
	key := utils.GetBillKey(id)

	// get bill from cache
	cached, err := utils.GetFromCache[models.Bill](ctx, key, s.cache)
	if cached != nil && err == nil {
		return cached, nil
	}

	bill, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if bill == nil {
		return nil, errors.New("bill not found")
	}

	return bill, nil
}

func (s *BillService) GetBillsByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Bill, error) {
	return s.repo.FindByHomeID(ctx, homeID, categoryID)
}

func (s *BillService) GetPrivateBillsByUserID(ctx context.Context, homeID, userID int, categoryID *int) ([]models.Bill, error) {
	return s.repo.FindPrivateByUserID(ctx, homeID, userID, categoryID)
}

func (s *BillService) Delete(ctx context.Context, id int) error {
	bill, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if bill == nil {
		return errors.New("bill not found")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	metrics.BillsTotal.Dec()
	metrics.BillOperationsTotal.WithLabelValues("delete").Inc()

	key := utils.GetBillKey(id)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	event.SendHomeEvent(ctx, s.cache, bill.HomeID, &event.RealTimeEvent{
		Module: event.ModuleBill,
		Action: event.ActionDeleted,
		Data:   map[string]int{"id": id},
	})

	return nil
}

func (s *BillService) UpdateBill(ctx context.Context, id int, billType *string, billCategoryID *int, public *bool, description, receiptImage *string, totalAmount *float64, start, end *time.Time, ocrData *datatypes.JSON) error {
	bill, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if bill == nil {
		return errors.New("bill not found")
	}

	if billType != nil {
		bill.Type = *billType
	}
	if billCategoryID != nil {
		bill.BillCategoryID = billCategoryID
	}
	if public != nil {
		bill.Public = *public
	}
	if description != nil {
		bill.Description = *description
	}
	if receiptImage != nil {
		bill.ReceiptImage = receiptImage
	}
	if totalAmount != nil {
		bill.TotalAmount = *totalAmount
	}
	if start != nil {
		bill.Start = *start
	}
	if end != nil {
		bill.End = *end
	}
	if ocrData != nil {
		bill.OCRData = *ocrData
	}

	if err := s.repo.Update(ctx, bill); err != nil {
		return err
	}

	key := utils.GetBillKey(id)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	event.SendHomeEvent(ctx, s.cache, bill.HomeID, &event.RealTimeEvent{
		Module: event.ModuleBill,
		Action: event.ActionUpdated,
		Data:   bill,
	})

	return nil
}

func (s *BillService) MarkBillPayed(ctx context.Context, id int) error {
	// change payed status
	if err := s.repo.MarkPayed(ctx, id); err != nil {
		return err
	}

	metrics.BillOperationsTotal.WithLabelValues("mark_paid").Inc()

	// remove from cache
	key := utils.GetBillKey(id)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	// get new bill data
	bill, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if bill == nil {
		return errors.New("bill not found")
	}

	// write to cache
	if err := utils.WriteToCache(ctx, key, bill, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	event.SendHomeEvent(ctx, s.cache, bill.HomeID, &event.RealTimeEvent{
		Module: event.ModuleBill,
		Action: event.ActionMarkedPayed,
		Data:   bill,
	})

	return nil
}

func (s *BillService) UpdateSplits(ctx context.Context, billID int, splits []models.SplitInput) error {
	bill, err := s.repo.FindByID(ctx, billID)
	if err != nil {
		return err
	}
	if bill == nil {
		return errors.New("bill not found")
	}

	if len(splits) > 0 {
		if err := validateSplits(splits, bill.TotalAmount); err != nil {
			return err
		}
	}

	billSplits := make([]models.BillSplit, len(splits))
	for i, sp := range splits {
		billSplits[i] = models.BillSplit{
			UserID: sp.UserID,
			Amount: sp.Amount,
		}
	}

	if err := s.repo.UpdateSplits(ctx, billID, billSplits); err != nil {
		return err
	}

	// Invalidate cache
	key := utils.GetBillKey(billID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	event.SendHomeEvent(ctx, s.cache, bill.HomeID, &event.RealTimeEvent{
		Module: event.ModuleBill,
		Action: event.ActionUpdated,
		Data:   map[string]int{"billID": billID},
	})

	return nil
}

func (s *BillService) GetSplitByID(ctx context.Context, splitID int) (*models.BillSplit, error) {
	return s.repo.FindSplitByID(ctx, splitID)
}

func (s *BillService) MarkSplitPaid(ctx context.Context, splitID int) error {
	split, err := s.repo.FindSplitByID(ctx, splitID)
	if err != nil {
		return err
	}
	if split == nil {
		return errors.New("split not found")
	}

	bill, err := s.repo.FindByID(ctx, split.BillID)
	if err != nil {
		return err
	}
	if bill == nil {
		return errors.New("bill not found")
	}

	if err := s.repo.MarkSplitPaid(ctx, splitID); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, bill.HomeID, &event.RealTimeEvent{
		Module: event.ModuleBill,
		Action: event.ActionUpdated,
		Data:   map[string]int{"splitID": splitID},
	})

	return nil
}

func nextBillPeriodEnd(start time.Time, recurrenceType string) time.Time {
	switch recurrenceType {
	case "daily":
		return start.AddDate(0, 0, 1)
	case "weekly":
		return start.AddDate(0, 0, 7)
	case "monthly":
		return start.AddDate(0, 1, 0)
	default:
		return start.AddDate(0, 1, 0)
	}
}

func calcNextBillRunDate(from time.Time, recurrenceType string, recurrenceDay *int) (time.Time, error) {
	base := from.Add(time.Minute).Truncate(time.Minute)
	switch recurrenceType {
	case "daily":
		return base.AddDate(0, 0, 1), nil
	case "weekly":
		if recurrenceDay == nil || *recurrenceDay < 0 || *recurrenceDay > 6 {
			return time.Time{}, errors.New("recurrence_day must be 0-6 for weekly bills")
		}
		targetWeekday := time.Weekday(*recurrenceDay)
		daysAhead := (int(targetWeekday) - int(base.Weekday()) + 7) % 7
		if daysAhead == 0 {
			daysAhead = 7
		}
		return base.AddDate(0, 0, daysAhead), nil
	case "monthly":
		if recurrenceDay == nil || *recurrenceDay < 1 || *recurrenceDay > 31 {
			return time.Time{}, errors.New("recurrence_day must be 1-31 for monthly bills")
		}
		year, month, _ := base.Date()
		location := base.Location()
		candidate := dateInMonthClamped(year, month, *recurrenceDay, base, location)
		if !candidate.After(base) {
			candidate = dateInMonthClamped(year, month+1, *recurrenceDay, base, location)
		}
		return candidate, nil
	default:
		return time.Time{}, errors.New("recurrence_type must be daily, weekly, or monthly")
	}
}

func dateInMonthClamped(year int, month time.Month, day int, base time.Time, location *time.Location) time.Time {
	lastDay := time.Date(year, month+1, 0, base.Hour(), base.Minute(), 0, 0, location).Day()
	clampedDay := int(math.Min(float64(day), float64(lastDay)))
	return time.Date(year, month, clampedDay, base.Hour(), base.Minute(), 0, 0, location)
}
