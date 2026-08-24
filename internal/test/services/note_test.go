package services

import (
	"context"
	"testing"

	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/internal/services"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

// Mock NoteRepository
type mockNoteRepo struct {
	CreateFunc             func(ctx context.Context, note *models.Note) error
	FindByIDFunc           func(ctx context.Context, id int) (*models.Note, error)
	FindByHomeIDFunc       func(ctx context.Context, homeID int, categoryID *int) ([]models.Note, error)
	UpdateFunc             func(ctx context.Context, note *models.Note) error
	DeleteFunc             func(ctx context.Context, id int) error
	CreateCategoryFunc     func(ctx context.Context, category *models.NoteCategory) error
	FindAllCategoriesFunc  func(ctx context.Context, homeID int) ([]models.NoteCategory, error)
	FindCategoryByIDFunc   func(ctx context.Context, id int) (*models.NoteCategory, error)
	UpdateCategoryFunc     func(ctx context.Context, category *models.NoteCategory, updates map[string]interface{}) (*models.NoteCategory, error)
	DeleteCategoryFunc     func(ctx context.Context, id int) error
}

func (m *mockNoteRepo) Create(ctx context.Context, note *models.Note) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, note)
	}
	note.ID = 1
	return nil
}
func (m *mockNoteRepo) FindByID(ctx context.Context, id int) (*models.Note, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *mockNoteRepo) FindByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Note, error) {
	if m.FindByHomeIDFunc != nil {
		return m.FindByHomeIDFunc(ctx, homeID, categoryID)
	}
	return []models.Note{}, nil
}
func (m *mockNoteRepo) Update(ctx context.Context, note *models.Note) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, note)
	}
	return nil
}
func (m *mockNoteRepo) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}
func (m *mockNoteRepo) CreateCategory(ctx context.Context, category *models.NoteCategory) error {
	if m.CreateCategoryFunc != nil {
		return m.CreateCategoryFunc(ctx, category)
	}
	category.ID = 1
	return nil
}
func (m *mockNoteRepo) FindAllCategories(ctx context.Context, homeID int) ([]models.NoteCategory, error) {
	if m.FindAllCategoriesFunc != nil {
		return m.FindAllCategoriesFunc(ctx, homeID)
	}
	return []models.NoteCategory{}, nil
}
func (m *mockNoteRepo) FindCategoryByID(ctx context.Context, id int) (*models.NoteCategory, error) {
	if m.FindCategoryByIDFunc != nil {
		return m.FindCategoryByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *mockNoteRepo) UpdateCategory(ctx context.Context, category *models.NoteCategory, updates map[string]interface{}) (*models.NoteCategory, error) {
	if m.UpdateCategoryFunc != nil {
		return m.UpdateCategoryFunc(ctx, category, updates)
	}
	return category, nil
}
func (m *mockNoteRepo) DeleteCategory(ctx context.Context, id int) error {
	if m.DeleteCategoryFunc != nil {
		return m.DeleteCategoryFunc(ctx, id)
	}
	return nil
}

// Mock UserRepository
type mockUserRepoNote struct {
	repository.UserRepository
}

// Mock HomeRepository
type mockHomeRepoNote struct {
	repository.HomeRepository
	GetMembersFunc func(ctx context.Context, homeID int) ([]models.HomeMembership, error)
}

func (m *mockHomeRepoNote) GetMembers(ctx context.Context, homeID int) ([]models.HomeMembership, error) {
	if m.GetMembersFunc != nil {
		return m.GetMembersFunc(ctx, homeID)
	}
	return []models.HomeMembership{}, nil
}

// Mock TaskRepository
type mockTaskRepoNote struct {
	repository.TaskRepository
	FindByIDFunc func(ctx context.Context, id int) (*models.Task, error)
}

func (m *mockTaskRepoNote) FindByID(ctx context.Context, id int) (*models.Task, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, id)
	}
	return nil, nil
}

// Mock BillRepository
type mockBillRepoNote struct {
	repository.BillRepository
	FindByIDFunc func(ctx context.Context, id int) (*models.Bill, error)
}

func (m *mockBillRepoNote) FindByID(ctx context.Context, id int) (*models.Bill, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, id)
	}
	return nil, nil
}

// Mock IBillCategoryRepository
type mockBillCategoryRepoNote struct {
	repository.IBillCategoryRepository
	GetByIDFunc func(ctx context.Context, id int) (*models.BillCategory, error)
}

func (m *mockBillCategoryRepoNote) GetByID(ctx context.Context, id int) (*models.BillCategory, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, nil
}

// Mock ShoppingRepository
type mockShoppingRepoNote struct {
	repository.ShoppingRepository
	FindItemByIDFunc     func(ctx context.Context, id int) (*models.ShoppingItem, error)
	FindCategoryByIDFunc func(ctx context.Context, id int) (*models.ShoppingCategory, error)
}

func (m *mockShoppingRepoNote) FindItemByID(ctx context.Context, id int) (*models.ShoppingItem, error) {
	if m.FindItemByIDFunc != nil {
		return m.FindItemByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *mockShoppingRepoNote) FindCategoryByID(ctx context.Context, id int) (*models.ShoppingCategory, error) {
	if m.FindCategoryByIDFunc != nil {
		return m.FindCategoryByIDFunc(ctx, id)
	}
	return nil, nil
}

func setupNoteService(
	repo repository.NoteRepository,
	homeRepo repository.HomeRepository,
	taskRepo repository.TaskRepository,
	billRepo repository.BillRepository,
	billCatRepo repository.IBillCategoryRepository,
	shoppingRepo repository.ShoppingRepository,
) *services.NoteService {
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	return services.NewNoteService(repo, &mockUserRepoNote{}, homeRepo, taskRepo, billRepo, billCatRepo, shoppingRepo, redisClient)
}

func TestNoteService_CreateCategory_Success(t *testing.T) {
	repo := &mockNoteRepo{}
	svc := setupNoteService(repo, &mockHomeRepoNote{}, &mockTaskRepoNote{}, &mockBillRepoNote{}, &mockBillCategoryRepoNote{}, &mockShoppingRepoNote{})

	cat, err := svc.CreateCategory(context.Background(), "Recipes", nil, "#FFFFFF", 1, 100)
	assert.NoError(t, err)
	assert.NotNil(t, cat)
	assert.Equal(t, "Recipes", cat.Name)
}

func TestNoteService_CreateNote_Success(t *testing.T) {
	repo := &mockNoteRepo{
		FindCategoryByIDFunc: func(ctx context.Context, id int) (*models.NoteCategory, error) {
			return &models.NoteCategory{ID: 1, HomeID: 1}, nil
		},
		FindByIDFunc: func(ctx context.Context, id int) (*models.Note, error) {
			return &models.Note{ID: id, HomeID: 1, Title: "Shopping List"}, nil
		},
	}
	homeRepo := &mockHomeRepoNote{
		GetMembersFunc: func(ctx context.Context, homeID int) ([]models.HomeMembership, error) {
			return []models.HomeMembership{
				{UserID: 101},
			}, nil
		},
	}
	taskRepo := &mockTaskRepoNote{
		FindByIDFunc: func(ctx context.Context, id int) (*models.Task, error) {
			return &models.Task{ID: id, HomeID: 1}, nil
		},
	}
	billRepo := &mockBillRepoNote{}
	billCatRepo := &mockBillCategoryRepoNote{}
	shoppingRepo := &mockShoppingRepoNote{}

	svc := setupNoteService(repo, homeRepo, taskRepo, billRepo, billCatRepo, shoppingRepo)

	noteID := 1
	catID := 1
	req := models.CreateNoteRequest{
		NoteCategoryID:   &catID,
		Title:            "Shopping List",
		Content:          "Please buy milk",
		MentionedUserIDs: []int{101},
		MentionedTaskIDs: []int{202},
	}

	note, err := svc.CreateNote(context.Background(), 1, 100, req)
	assert.NoError(t, err)
	assert.NotNil(t, note)
	assert.Equal(t, "Shopping List", note.Title)
	assert.Equal(t, noteID, note.ID)
}

func TestNoteService_CreateNote_InvalidMentionUser(t *testing.T) {
	repo := &mockNoteRepo{}
	homeRepo := &mockHomeRepoNote{
		GetMembersFunc: func(ctx context.Context, homeID int) ([]models.HomeMembership, error) {
			return []models.HomeMembership{
				{UserID: 101}, // only 101 is member
			}, nil
		},
	}
	taskRepo := &mockTaskRepoNote{}
	billRepo := &mockBillRepoNote{}
	billCatRepo := &mockBillCategoryRepoNote{}
	shoppingRepo := &mockShoppingRepoNote{}

	svc := setupNoteService(repo, homeRepo, taskRepo, billRepo, billCatRepo, shoppingRepo)

	req := models.CreateNoteRequest{
		Title:            "Shopping List",
		Content:          "Hey @999",
		MentionedUserIDs: []int{999}, // not a member
	}

	_, err := svc.CreateNote(context.Background(), 1, 100, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "is not a member of this home")
}
