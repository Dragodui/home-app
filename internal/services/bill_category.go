package services

import (
	"context"
	"errors"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type IBillCategoryService interface {
	CreateCategory(ctx context.Context, homeID int, name string, icon *string, color string, public bool, createdBy int) error
	GetCategoryByID(ctx context.Context, id int) (*models.BillCategory, error)
	GetCategories(ctx context.Context, homeID, userID int, public bool) ([]models.BillCategory, error)
	UpdateCategory(ctx context.Context, categoryID int, name, icon, color *string) (*models.BillCategory, error)
	DeleteCategory(ctx context.Context, id int, homeID int) error
}

type BillCategoryService struct {
	cache *redis.Client
	repo  repository.IBillCategoryRepository
}

func NewBillCategoryService(repo repository.IBillCategoryRepository, cache *redis.Client) *BillCategoryService {
	return &BillCategoryService{repo: repo, cache: cache}
}

func (s *BillCategoryService) GetCategoryByID(ctx context.Context, id int) (*models.BillCategory, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *BillCategoryService) CreateCategory(ctx context.Context, homeID int, name string, icon *string, color string, public bool, createdBy int) error {
	if color == "" {
		color = "#FBEB9E"
	}

	category := &models.BillCategory{
		HomeID:    homeID,
		CreatedBy: createdBy,
		Public:    public,
		Name:      name,
		Icon:      icon,
		Color:     color,
	}

	s.invalidateCategoriesCache(ctx, homeID, createdBy, public)

	if err := s.repo.Create(ctx, category); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleBillCategory,
		Action: event.ActionCreated,
		Data:   category,
	})

	return nil
}

func (s *BillCategoryService) GetCategories(ctx context.Context, homeID, userID int, public bool) ([]models.BillCategory, error) {
	key := utils.GetBillCategoriesKey(homeID, userID, public)

	cached, err := utils.GetFromCache[[]models.BillCategory](ctx, key, s.cache)
	if cached != nil && err == nil {
		return *cached, nil
	}

	categories, err := s.repo.GetVisibleByHomeID(ctx, homeID, userID, public)
	if err != nil {
		return nil, err
	}

	if len(categories) > 0 {
		_ = utils.WriteToCache(ctx, key, categories, s.cache)
	}

	return categories, nil
}

func (s *BillCategoryService) UpdateCategory(ctx context.Context, categoryID int, name, icon, color *string) (*models.BillCategory, error) {
	category, err := s.repo.GetByID(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, errors.New("category not found")
	}

	s.invalidateCategoriesCache(ctx, category.HomeID, category.CreatedBy, category.Public)

	updates := map[string]interface{}{}
	if name != nil {
		updates["name"] = *name
	}
	if icon != nil {
		updates["icon"] = *icon
	}
	if color != nil {
		updates["color"] = *color
	}

	newCategory, err := s.repo.Update(ctx, category, updates)
	if err != nil {
		return nil, err
	}

	event.SendHomeEvent(ctx, s.cache, category.HomeID, &event.RealTimeEvent{
		Module: event.ModuleBillCategory,
		Action: event.ActionUpdated,
		Data:   newCategory,
	})

	return newCategory, nil
}

func (s *BillCategoryService) DeleteCategory(ctx context.Context, id int, homeID int) error {
	category, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if category == nil {
		return errors.New("category not found")
	}
	s.invalidateCategoriesCache(ctx, homeID, category.CreatedBy, category.Public)

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleBillCategory,
		Action: event.ActionDeleted,
		Data:   map[string]int{"id": id},
	})

	return nil
}

func (s *BillCategoryService) invalidateCategoriesCache(ctx context.Context, homeID, userID int, public bool) {
	keys := []string{
		utils.GetBillCategoriesKey(homeID, 0, true),
		utils.GetBillCategoriesKey(homeID, userID, true),
		utils.GetBillCategoriesKey(homeID, userID, public),
	}
	for _, key := range keys {
		if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
			logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
		}
	}
}
