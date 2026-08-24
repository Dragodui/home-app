package repository

import (
	"context"
	"errors"

	"github.com/Dragodui/diploma-server/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type NoteRepository interface {
	// notes
	Create(ctx context.Context, note *models.Note) error
	FindByID(ctx context.Context, id int) (*models.Note, error)
	FindByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Note, error)
	Update(ctx context.Context, note *models.Note) error
	Delete(ctx context.Context, id int) error

	// note categories
	CreateCategory(ctx context.Context, category *models.NoteCategory) error
	FindAllCategories(ctx context.Context, homeID int) ([]models.NoteCategory, error)
	FindCategoryByID(ctx context.Context, id int) (*models.NoteCategory, error)
	UpdateCategory(ctx context.Context, category *models.NoteCategory, updates map[string]interface{}) (*models.NoteCategory, error)
	DeleteCategory(ctx context.Context, id int) error
}

type noteRepo struct {
	db *gorm.DB
}

func NewNoteRepository(db *gorm.DB) NoteRepository {
	return &noteRepo{db: db}
}

// Create a new note
func (r *noteRepo) Create(ctx context.Context, note *models.Note) error {
	return r.db.WithContext(ctx).Create(note).Error
}

// Find note by ID with all preloaded relations and mentions
func (r *noteRepo) FindByID(ctx context.Context, id int) (*models.Note, error) {
	var note models.Note
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("NoteCategory").
		Preload("MentionedUsers").
		Preload("MentionedTasks").
		Preload("MentionedBills").
		Preload("MentionedShoppingItems").
		Preload("MentionedNoteCategories").
		Preload("MentionedBillCategories").
		Preload("MentionedShoppingCategories").
		First(&note, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &note, nil
}

// Find all notes for a home, optionally filtered by category
func (r *noteRepo) FindByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Note, error) {
	var notes []models.Note
	query := r.db.WithContext(ctx).Where("home_id = ?", homeID)
	if categoryID != nil {
		query = query.Where("note_category_id = ?", *categoryID)
	}

	err := query.
		Preload("Creator").
		Preload("NoteCategory").
		Preload("MentionedUsers").
		Preload("MentionedTasks").
		Preload("MentionedBills").
		Preload("MentionedShoppingItems").
		Preload("MentionedNoteCategories").
		Preload("MentionedBillCategories").
		Preload("MentionedShoppingCategories").
		Order("created_at DESC").
		Find(&notes).Error

	return notes, err
}

// Update note and its associations
func (r *noteRepo) Update(ctx context.Context, note *models.Note) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(note).Error; err != nil {
			return err
		}
		// Explicitly replace associations for mentions
		if err := tx.Model(note).Association("MentionedUsers").Replace(note.MentionedUsers); err != nil {
			return err
		}
		if err := tx.Model(note).Association("MentionedTasks").Replace(note.MentionedTasks); err != nil {
			return err
		}
		if err := tx.Model(note).Association("MentionedBills").Replace(note.MentionedBills); err != nil {
			return err
		}
		if err := tx.Model(note).Association("MentionedShoppingItems").Replace(note.MentionedShoppingItems); err != nil {
			return err
		}
		if err := tx.Model(note).Association("MentionedNoteCategories").Replace(note.MentionedNoteCategories); err != nil {
			return err
		}
		if err := tx.Model(note).Association("MentionedBillCategories").Replace(note.MentionedBillCategories); err != nil {
			return err
		}
		if err := tx.Model(note).Association("MentionedShoppingCategories").Replace(note.MentionedShoppingCategories); err != nil {
			return err
		}
		return nil
	})
}

// Delete a note
func (r *noteRepo) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&models.Note{}, id).Error
}

// Create note category
func (r *noteRepo) CreateCategory(ctx context.Context, category *models.NoteCategory) error {
	return r.db.WithContext(ctx).Create(category).Error
}

// Get all categories in a home
func (r *noteRepo) FindAllCategories(ctx context.Context, homeID int) ([]models.NoteCategory, error) {
	var categories []models.NoteCategory
	err := r.db.WithContext(ctx).Where("home_id = ?", homeID).Order("created_at ASC").Find(&categories).Error
	return categories, err
}

// Find category by ID
func (r *noteRepo) FindCategoryByID(ctx context.Context, id int) (*models.NoteCategory, error) {
	var category models.NoteCategory
	err := r.db.WithContext(ctx).First(&category, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &category, nil
}

// Update category
func (r *noteRepo) UpdateCategory(ctx context.Context, category *models.NoteCategory, updates map[string]interface{}) (*models.NoteCategory, error) {
	err := r.db.WithContext(ctx).Model(category).Clauses(clause.Returning{}).Updates(updates).Error
	if err != nil {
		return nil, err
	}
	return category, nil
}

// Delete category
func (r *noteRepo) DeleteCategory(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&models.NoteCategory{}, id).Error
}
