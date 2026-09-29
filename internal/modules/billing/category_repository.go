package billing

import (
	"context"

	"github.com/Dragodui/diploma-server/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CategoryRepository interface {
	Create(ctx context.Context, category *models.BillCategory) error
	GetByHomeID(ctx context.Context, homeID int) ([]models.BillCategory, error)
	GetVisibleByHomeID(ctx context.Context, homeID, userID int, public bool) ([]models.BillCategory, error)
	Update(ctx context.Context, category *models.BillCategory, updates map[string]interface{}) (*models.BillCategory, error)
	Delete(ctx context.Context, id int) error
	GetByID(ctx context.Context, id int) (*models.BillCategory, error)
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(ctx context.Context, category *models.BillCategory) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *categoryRepository) GetByHomeID(ctx context.Context, homeID int) ([]models.BillCategory, error) {
	var categories []models.BillCategory
	err := r.db.WithContext(ctx).Where("home_id = ?", homeID).Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) GetVisibleByHomeID(ctx context.Context, homeID, userID int, public bool) ([]models.BillCategory, error) {
	var categories []models.BillCategory
	query := r.db.WithContext(ctx).Where("home_id = ?", homeID).Where("public = ?", public)
	if !public {
		query = query.Where("created_by = ?", userID)
	}
	err := query.Order("created_at ASC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&models.BillCategory{}, id).Error
}

func (r *categoryRepository) GetByID(ctx context.Context, id int) (*models.BillCategory, error) {
	var category models.BillCategory
	err := r.db.WithContext(ctx).First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepository) Update(ctx context.Context, category *models.BillCategory, updates map[string]interface{}) (*models.BillCategory, error) {
	err := r.db.WithContext(ctx).Model(category).Clauses(clause.Returning{}).Updates(updates).Error
	if err != nil {
		return nil, err
	}
	return category, nil
}
