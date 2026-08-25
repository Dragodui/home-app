package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type NoteService struct {
	repo         repository.NoteRepository
	userRepo     repository.UserRepository
	homeRepo     repository.HomeRepository
	taskRepo     repository.TaskRepository
	billRepo     repository.BillRepository
	billCatRepo  repository.IBillCategoryRepository
	shoppingRepo repository.ShoppingRepository
	cache        *redis.Client
}

type INoteService interface {
	// notes
	CreateNote(ctx context.Context, homeID, createdBy int, req models.CreateNoteRequest) (*models.Note, error)
	GetNoteByID(ctx context.Context, id, homeID int) (*models.Note, error)
	GetNotesByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Note, error)
	UpdateNote(ctx context.Context, id, homeID, userID int, req models.UpdateNoteRequest) (*models.Note, error)
	DeleteNote(ctx context.Context, id, homeID int) error

	// note categories
	CreateCategory(ctx context.Context, name string, icon *string, color string, homeID, createdBy int) (*models.NoteCategory, error)
	GetCategoriesByHomeID(ctx context.Context, homeID int) ([]models.NoteCategory, error)
	GetCategoryByID(ctx context.Context, id, homeID int) (*models.NoteCategory, error)
	UpdateCategory(ctx context.Context, id, homeID int, name, icon, color *string) (*models.NoteCategory, error)
	DeleteCategory(ctx context.Context, id, homeID int) error
}

func NewNoteService(
	repo repository.NoteRepository,
	userRepo repository.UserRepository,
	homeRepo repository.HomeRepository,
	taskRepo repository.TaskRepository,
	billRepo repository.BillRepository,
	billCatRepo repository.IBillCategoryRepository,
	shoppingRepo repository.ShoppingRepository,
	cache *redis.Client,
) *NoteService {
	return &NoteService{
		repo:         repo,
		userRepo:     userRepo,
		homeRepo:     homeRepo,
		taskRepo:     taskRepo,
		billRepo:     billRepo,
		billCatRepo:  billCatRepo,
		shoppingRepo: shoppingRepo,
		cache:        cache,
	}
}

// Validation helpers
func (s *NoteService) validateUsers(ctx context.Context, homeID int, userIDs []int) error {
	if len(userIDs) == 0 {
		return nil
	}
	members, err := s.homeRepo.GetMembers(ctx, homeID)
	if err != nil {
		return err
	}
	memberMap := make(map[int]bool)
	for _, m := range members {
		memberMap[m.UserID] = true
	}
	for _, uid := range userIDs {
		if !memberMap[uid] {
			return fmt.Errorf("user %d is not a member of this home", uid)
		}
	}
	return nil
}

func (s *NoteService) validateTasks(ctx context.Context, homeID int, taskIDs []int) error {
	for _, tid := range taskIDs {
		t, err := s.taskRepo.FindByID(ctx, tid)
		if err != nil {
			return err
		}
		if t == nil || t.HomeID != homeID {
			return fmt.Errorf("task %d does not exist in this home", tid)
		}
	}
	return nil
}

func (s *NoteService) validateBills(ctx context.Context, homeID int, billIDs []int) error {
	for _, bid := range billIDs {
		b, err := s.billRepo.FindByID(ctx, bid)
		if err != nil {
			return err
		}
		if b == nil || b.HomeID != homeID {
			return fmt.Errorf("bill %d does not exist in this home", bid)
		}
	}
	return nil
}

func (s *NoteService) validateShoppingItems(ctx context.Context, homeID int, itemIDs []int) error {
	for _, iid := range itemIDs {
		item, err := s.shoppingRepo.FindItemByID(ctx, iid)
		if err != nil {
			return err
		}
		if item == nil {
			return fmt.Errorf("shopping item %d does not exist", iid)
		}
		cat, err := s.shoppingRepo.FindCategoryByID(ctx, item.CategoryID)
		if err != nil {
			return err
		}
		if cat == nil || cat.HomeID != homeID {
			return fmt.Errorf("shopping item %d does not exist in this home", iid)
		}
	}
	return nil
}

func (s *NoteService) validateNoteCategories(ctx context.Context, homeID int, catIDs []int) error {
	for _, cid := range catIDs {
		cat, err := s.repo.FindCategoryByID(ctx, cid)
		if err != nil {
			return err
		}
		if cat == nil || cat.HomeID != homeID {
			return fmt.Errorf("note category %d does not exist in this home", cid)
		}
	}
	return nil
}

func (s *NoteService) validateBillCategories(ctx context.Context, homeID int, catIDs []int) error {
	for _, cid := range catIDs {
		cat, err := s.billCatRepo.GetByID(ctx, cid)
		if err != nil {
			return err
		}
		if cat == nil || cat.HomeID != homeID {
			return fmt.Errorf("bill category %d does not exist in this home", cid)
		}
	}
	return nil
}

func (s *NoteService) validateShoppingCategories(ctx context.Context, homeID int, catIDs []int) error {
	for _, cid := range catIDs {
		cat, err := s.shoppingRepo.FindCategoryByID(ctx, cid)
		if err != nil {
			return err
		}
		if cat == nil || cat.HomeID != homeID {
			return fmt.Errorf("shopping category %d does not exist in this home", cid)
		}
	}
	return nil
}

// CreateNote creates a new note
func (s *NoteService) CreateNote(ctx context.Context, homeID, createdBy int, req models.CreateNoteRequest) (*models.Note, error) {
	// Invalidate cache
	notesKey := utils.GetAllNotesForHomeKey(homeID)
	_ = utils.DeleteFromCache(ctx, notesKey, s.cache)

	// Validate category if set
	if req.NoteCategoryID != nil {
		cat, err := s.repo.FindCategoryByID(ctx, *req.NoteCategoryID)
		if err != nil {
			return nil, err
		}
		if cat == nil || cat.HomeID != homeID {
			return nil, errors.New("note category not found in this home")
		}
	}

	// Validate mentions
	if err := s.validateUsers(ctx, homeID, req.MentionedUserIDs); err != nil {
		return nil, err
	}
	if err := s.validateTasks(ctx, homeID, req.MentionedTaskIDs); err != nil {
		return nil, err
	}
	if err := s.validateBills(ctx, homeID, req.MentionedBillIDs); err != nil {
		return nil, err
	}
	if err := s.validateShoppingItems(ctx, homeID, req.MentionedShoppingItemIDs); err != nil {
		return nil, err
	}
	if err := s.validateNoteCategories(ctx, homeID, req.MentionedNoteCategoryIDs); err != nil {
		return nil, err
	}
	if err := s.validateBillCategories(ctx, homeID, req.MentionedBillCategoryIDs); err != nil {
		return nil, err
	}
	if err := s.validateShoppingCategories(ctx, homeID, req.MentionedShoppingCategoryIDs); err != nil {
		return nil, err
	}

	note := &models.Note{
		HomeID:         homeID,
		NoteCategoryID: req.NoteCategoryID,
		CreatedBy:      createdBy,
		Title:          req.Title,
		Content:        req.Content,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Build placeholders for GORM many-to-many link insert
	for _, id := range req.MentionedUserIDs {
		note.MentionedUsers = append(note.MentionedUsers, models.User{ID: id})
	}
	for _, id := range req.MentionedTaskIDs {
		note.MentionedTasks = append(note.MentionedTasks, models.Task{ID: id})
	}
	for _, id := range req.MentionedBillIDs {
		note.MentionedBills = append(note.MentionedBills, models.Bill{ID: id})
	}
	for _, id := range req.MentionedShoppingItemIDs {
		note.MentionedShoppingItems = append(note.MentionedShoppingItems, models.ShoppingItem{ID: id})
	}
	for _, id := range req.MentionedNoteCategoryIDs {
		note.MentionedNoteCategories = append(note.MentionedNoteCategories, models.NoteCategory{ID: id})
	}
	for _, id := range req.MentionedBillCategoryIDs {
		note.MentionedBillCategories = append(note.MentionedBillCategories, models.BillCategory{ID: id})
	}
	for _, id := range req.MentionedShoppingCategoryIDs {
		note.MentionedShoppingCategories = append(note.MentionedShoppingCategories, models.ShoppingCategory{ID: id})
	}

	if err := s.repo.Create(ctx, note); err != nil {
		return nil, err
	}

	// Fetch full populated note to return and cache
	fullNote, err := s.repo.FindByID(ctx, note.ID)
	if err != nil {
		return note, nil
	}

	// Event
	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleNote,
		Action: event.ActionCreated,
		Data:   fullNote,
	})

	return fullNote, nil
}

// GetNoteByID fetches note details
func (s *NoteService) GetNoteByID(ctx context.Context, id, homeID int) (*models.Note, error) {
	key := utils.GetNoteKey(id)
	cached, err := utils.GetFromCache[models.Note](ctx, key, s.cache)
	if cached != nil && err == nil {
		if cached.HomeID != homeID {
			return nil, errors.New("note not found")
		}
		return cached, nil
	}

	note, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if note == nil || note.HomeID != homeID {
		return nil, errors.New("note not found")
	}

	_ = utils.WriteToCache(ctx, key, note, s.cache)
	return note, nil
}

// GetNotesByHomeID returns all notes in home
func (s *NoteService) GetNotesByHomeID(ctx context.Context, homeID int, categoryID *int) ([]models.Note, error) {
	if categoryID == nil {
		// Use cache for all notes
		key := utils.GetAllNotesForHomeKey(homeID)
		cached, err := utils.GetFromCache[[]models.Note](ctx, key, s.cache)
		if cached != nil && err == nil {
			return *cached, nil
		}

		notes, err := s.repo.FindByHomeID(ctx, homeID, nil)
		if err != nil {
			return nil, err
		}

		_ = utils.WriteToCache(ctx, key, &notes, s.cache)
		return notes, nil
	}

	return s.repo.FindByHomeID(ctx, homeID, categoryID)
}

// UpdateNote updates an existing note and associations
func (s *NoteService) UpdateNote(ctx context.Context, id, homeID, userID int, req models.UpdateNoteRequest) (*models.Note, error) {
	note, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if note == nil || note.HomeID != homeID {
		return nil, errors.New("note not found")
	}

	// Invalidate cache
	_ = utils.DeleteFromCache(ctx, utils.GetNoteKey(id), s.cache)
	_ = utils.DeleteFromCache(ctx, utils.GetAllNotesForHomeKey(homeID), s.cache)

	if req.Title != nil {
		note.Title = *req.Title
	}
	if req.Content != nil {
		note.Content = *req.Content
	}
	if req.NoteCategoryID != nil {
		if *req.NoteCategoryID == 0 {
			note.NoteCategoryID = nil
		} else {
			cat, err := s.repo.FindCategoryByID(ctx, *req.NoteCategoryID)
			if err != nil {
				return nil, err
			}
			if cat == nil || cat.HomeID != homeID {
				return nil, errors.New("note category not found in this home")
			}
			note.NoteCategoryID = req.NoteCategoryID
		}
	}

	// Update mentions if sent
	if req.MentionedUserIDs != nil {
		if err := s.validateUsers(ctx, homeID, *req.MentionedUserIDs); err != nil {
			return nil, err
		}
		note.MentionedUsers = []models.User{}
		for _, uid := range *req.MentionedUserIDs {
			note.MentionedUsers = append(note.MentionedUsers, models.User{ID: uid})
		}
	}
	if req.MentionedTaskIDs != nil {
		if err := s.validateTasks(ctx, homeID, *req.MentionedTaskIDs); err != nil {
			return nil, err
		}
		note.MentionedTasks = []models.Task{}
		for _, tid := range *req.MentionedTaskIDs {
			note.MentionedTasks = append(note.MentionedTasks, models.Task{ID: tid})
		}
	}
	if req.MentionedBillIDs != nil {
		if err := s.validateBills(ctx, homeID, *req.MentionedBillIDs); err != nil {
			return nil, err
		}
		note.MentionedBills = []models.Bill{}
		for _, bid := range *req.MentionedBillIDs {
			note.MentionedBills = append(note.MentionedBills, models.Bill{ID: bid})
		}
	}
	if req.MentionedShoppingItemIDs != nil {
		if err := s.validateShoppingItems(ctx, homeID, *req.MentionedShoppingItemIDs); err != nil {
			return nil, err
		}
		note.MentionedShoppingItems = []models.ShoppingItem{}
		for _, iid := range *req.MentionedShoppingItemIDs {
			note.MentionedShoppingItems = append(note.MentionedShoppingItems, models.ShoppingItem{ID: iid})
		}
	}
	if req.MentionedNoteCategoryIDs != nil {
		if err := s.validateNoteCategories(ctx, homeID, *req.MentionedNoteCategoryIDs); err != nil {
			return nil, err
		}
		note.MentionedNoteCategories = []models.NoteCategory{}
		for _, cid := range *req.MentionedNoteCategoryIDs {
			note.MentionedNoteCategories = append(note.MentionedNoteCategories, models.NoteCategory{ID: cid})
		}
	}
	if req.MentionedBillCategoryIDs != nil {
		if err := s.validateBillCategories(ctx, homeID, *req.MentionedBillCategoryIDs); err != nil {
			return nil, err
		}
		note.MentionedBillCategories = []models.BillCategory{}
		for _, cid := range *req.MentionedBillCategoryIDs {
			note.MentionedBillCategories = append(note.MentionedBillCategories, models.BillCategory{ID: cid})
		}
	}
	if req.MentionedShoppingCategoryIDs != nil {
		if err := s.validateShoppingCategories(ctx, homeID, *req.MentionedShoppingCategoryIDs); err != nil {
			return nil, err
		}
		note.MentionedShoppingCategories = []models.ShoppingCategory{}
		for _, cid := range *req.MentionedShoppingCategoryIDs {
			note.MentionedShoppingCategories = append(note.MentionedShoppingCategories, models.ShoppingCategory{ID: cid})
		}
	}

	note.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, note); err != nil {
		return nil, err
	}

	// Fetch fully loaded updated note
	fullNote, err := s.repo.FindByID(ctx, note.ID)
	if err != nil {
		return note, nil
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleNote,
		Action: event.ActionUpdated,
		Data:   fullNote,
	})

	return fullNote, nil
}

// DeleteNote deletes a note
func (s *NoteService) DeleteNote(ctx context.Context, id, homeID int) error {
	note, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if note == nil || note.HomeID != homeID {
		return errors.New("note not found")
	}

	_ = utils.DeleteFromCache(ctx, utils.GetNoteKey(id), s.cache)
	_ = utils.DeleteFromCache(ctx, utils.GetAllNotesForHomeKey(homeID), s.cache)

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleNote,
		Action: event.ActionDeleted,
		Data:   map[string]int{"id": id},
	})

	return nil
}

// CreateCategory creates a note category
func (s *NoteService) CreateCategory(ctx context.Context, name string, icon *string, color string, homeID, createdBy int) (*models.NoteCategory, error) {
	key := utils.GetAllNoteCategoriesForHomeKey(homeID)
	_ = utils.DeleteFromCache(ctx, key, s.cache)

	category := &models.NoteCategory{
		Name:      name,
		Icon:      icon,
		Color:     color,
		HomeID:    homeID,
		CreatedBy: createdBy,
	}

	if err := s.repo.CreateCategory(ctx, category); err != nil {
		return nil, err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleNoteCategory,
		Action: event.ActionCreated,
		Data:   category,
	})

	return category, nil
}

// GetCategoriesByHomeID gets all note categories in a home
func (s *NoteService) GetCategoriesByHomeID(ctx context.Context, homeID int) ([]models.NoteCategory, error) {
	key := utils.GetAllNoteCategoriesForHomeKey(homeID)
	cached, err := utils.GetFromCache[[]models.NoteCategory](ctx, key, s.cache)
	if cached != nil && err == nil {
		return *cached, nil
	}

	categories, err := s.repo.FindAllCategories(ctx, homeID)
	if err != nil {
		return nil, err
	}

	_ = utils.WriteToCache(ctx, key, &categories, s.cache)
	return categories, nil
}

// GetCategoryByID gets category details
func (s *NoteService) GetCategoryByID(ctx context.Context, id, homeID int) (*models.NoteCategory, error) {
	key := utils.GetNoteCategoryKey(id)
	cached, err := utils.GetFromCache[models.NoteCategory](ctx, key, s.cache)
	if cached != nil && err == nil {
		if cached.HomeID != homeID {
			return nil, errors.New("category not found")
		}
		return cached, nil
	}

	category, err := s.repo.FindCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if category == nil || category.HomeID != homeID {
		return nil, errors.New("category not found")
	}

	_ = utils.WriteToCache(ctx, key, category, s.cache)
	return category, nil
}

// UpdateCategory updates category fields
func (s *NoteService) UpdateCategory(ctx context.Context, id, homeID int, name, icon, color *string) (*models.NoteCategory, error) {
	category, err := s.repo.FindCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if category == nil || category.HomeID != homeID {
		return nil, errors.New("category not found")
	}

	_ = utils.DeleteFromCache(ctx, utils.GetNoteCategoryKey(id), s.cache)
	_ = utils.DeleteFromCache(ctx, utils.GetAllNoteCategoriesForHomeKey(homeID), s.cache)

	updates := make(map[string]interface{})
	if name != nil {
		updates["name"] = *name
	}
	if icon != nil {
		updates["icon"] = *icon
	}
	if color != nil {
		updates["color"] = *color
	}

	updatedCategory, err := s.repo.UpdateCategory(ctx, category, updates)
	if err != nil {
		return nil, err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleNoteCategory,
		Action: event.ActionUpdated,
		Data:   updatedCategory,
	})

	return updatedCategory, nil
}

// DeleteCategory deletes a category
func (s *NoteService) DeleteCategory(ctx context.Context, id, homeID int) error {
	category, err := s.repo.FindCategoryByID(ctx, id)
	if err != nil {
		return err
	}
	if category == nil || category.HomeID != homeID {
		return errors.New("category not found")
	}

	_ = utils.DeleteFromCache(ctx, utils.GetNoteCategoryKey(id), s.cache)
	_ = utils.DeleteFromCache(ctx, utils.GetAllNoteCategoriesForHomeKey(homeID), s.cache)

	if err := s.repo.DeleteCategory(ctx, id); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleNoteCategory,
		Action: event.ActionDeleted,
		Data:   map[string]int{"id": id},
	})

	return nil
}
