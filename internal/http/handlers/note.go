package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Dragodui/diploma-server/internal/http/middleware"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/internal/services"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/go-chi/chi/v5"
)

type NoteHandler struct {
	svc      services.INoteService
	homeRepo repository.HomeRepository
}

func NewNoteHandler(svc services.INoteService, homeRepo repository.HomeRepository) *NoteHandler {
	return &NoteHandler{svc: svc, homeRepo: homeRepo}
}

// CreateNote godoc
// @Summary      Create a new note
// @Description  Create a new note in a home, optionally mentioning users, tasks, bills, shopping items, and categories
// @Tags         note
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        input body models.CreateNoteRequest true "Create Note Request"
// @Success      201  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /homes/{home_id}/notes [post]
func (h *NoteHandler) CreateNote(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	var req models.CreateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	note, err := h.svc.CreateNote(r.Context(), homeID, userID, req)
	if err != nil {
		utils.SafeError(w, err, "Failed to create note", http.StatusBadRequest)
		return
	}

	utils.JSON(w, http.StatusCreated, map[string]interface{}{
		"status":  true,
		"message": "Note created successfully",
		"data":    note,
	})
}

// GetNoteByID godoc
// @Summary      Get note by ID
// @Description  Get detailed information of a note including its mentions
// @Tags         note
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        note_id path int true "Note ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /homes/{home_id}/notes/{note_id} [get]
func (h *NoteHandler) GetNoteByID(w http.ResponseWriter, r *http.Request) {
	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	noteID, err := strconv.Atoi(chi.URLParam(r, "note_id"))
	if err != nil {
		utils.JSONError(w, "Invalid note ID", http.StatusBadRequest)
		return
	}

	note, err := h.svc.GetNoteByID(r.Context(), noteID, homeID)
	if err != nil {
		utils.SafeError(w, err, "Failed to retrieve note", http.StatusNotFound)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status": true,
		"data":   note,
	})
}

// GetNotesByHomeID godoc
// @Summary      Get all notes
// @Description  Get all notes for a home, optionally filtered by note category
// @Tags         note
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        category_id query int false "Category ID filter"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /homes/{home_id}/notes [get]
func (h *NoteHandler) GetNotesByHomeID(w http.ResponseWriter, r *http.Request) {
	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	var categoryID *int
	if catStr := r.URL.Query().Get("category_id"); catStr != "" {
		if catIDVal, err := strconv.Atoi(catStr); err == nil {
			categoryID = &catIDVal
		}
	}

	notes, err := h.svc.GetNotesByHomeID(r.Context(), homeID, categoryID)
	if err != nil {
		utils.SafeError(w, err, "Failed to retrieve notes", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status": true,
		"data":   notes,
	})
}

// UpdateNote godoc
// @Summary      Update a note
// @Description  Update a note details and its mentions
// @Tags         note
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        note_id path int true "Note ID"
// @Param        input body models.UpdateNoteRequest true "Update Note Request"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /homes/{home_id}/notes/{note_id} [put]
func (h *NoteHandler) UpdateNote(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	noteID, err := strconv.Atoi(chi.URLParam(r, "note_id"))
	if err != nil {
		utils.JSONError(w, "Invalid note ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	updatedNote, err := h.svc.UpdateNote(r.Context(), noteID, homeID, userID, req)
	if err != nil {
		utils.SafeError(w, err, "Failed to update note", http.StatusBadRequest)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  true,
		"message": "Note updated successfully",
		"data":    updatedNote,
	})
}

// DeleteNote godoc
// @Summary      Delete a note
// @Description  Delete a note from a home
// @Tags         note
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        note_id path int true "Note ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /homes/{home_id}/notes/{note_id} [delete]
func (h *NoteHandler) DeleteNote(w http.ResponseWriter, r *http.Request) {
	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	noteID, err := strconv.Atoi(chi.URLParam(r, "note_id"))
	if err != nil {
		utils.JSONError(w, "Invalid note ID", http.StatusBadRequest)
		return
	}

	if err := h.svc.DeleteNote(r.Context(), noteID, homeID); err != nil {
		utils.SafeError(w, err, "Failed to delete note", http.StatusNotFound)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  true,
		"message": "Note deleted successfully",
	})
}

// CreateCategory godoc
// @Summary      Create note category
// @Description  Create a new category for notes in a home
// @Tags         note_category
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        input body models.CreateNoteCategoryRequest true "Create Category Request"
// @Success      201  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Router       /homes/{home_id}/note_categories [post]
func (h *NoteHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	var req models.CreateNoteCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	category, err := h.svc.CreateCategory(r.Context(), req.Name, req.Icon, req.Color, homeID, userID)
	if err != nil {
		utils.SafeError(w, err, "Failed to create category", http.StatusBadRequest)
		return
	}

	utils.JSON(w, http.StatusCreated, map[string]interface{}{
		"status":  true,
		"message": "Category created successfully",
		"data":    category,
	})
}

// GetCategoriesByHomeID godoc
// @Summary      Get all note categories
// @Description  Get all note categories in a home
// @Tags         note_category
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Router       /homes/{home_id}/note_categories [get]
func (h *NoteHandler) GetCategoriesByHomeID(w http.ResponseWriter, r *http.Request) {
	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	categories, err := h.svc.GetCategoriesByHomeID(r.Context(), homeID)
	if err != nil {
		utils.SafeError(w, err, "Failed to retrieve categories", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status": true,
		"data":   categories,
	})
}

// UpdateCategory godoc
// @Summary      Update note category
// @Description  Update a note category by ID
// @Tags         note_category
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        category_id path int true "Category ID"
// @Param        input body models.UpdateNoteCategoryRequest true "Update Category Request"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /homes/{home_id}/note_categories/{category_id} [put]
func (h *NoteHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	categoryID, err := strconv.Atoi(chi.URLParam(r, "category_id"))
	if err != nil {
		utils.JSONError(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateNoteCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Verify category ownership/admin rights if applicable
	category, err := h.svc.GetCategoryByID(r.Context(), categoryID, homeID)
	if err != nil {
		utils.SafeError(w, err, "Failed to find category", http.StatusNotFound)
		return
	}
	if category.CreatedBy != userID {
		isAdmin, _ := h.homeRepo.IsAdmin(r.Context(), homeID, userID)
		if !isAdmin {
			utils.JSONError(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	updatedCategory, err := h.svc.UpdateCategory(r.Context(), categoryID, homeID, req.Name, req.Icon, req.Color)
	if err != nil {
		utils.SafeError(w, err, "Failed to update category", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  true,
		"message": "Category updated successfully",
		"data":    updatedCategory,
	})
}

// DeleteCategory godoc
// @Summary      Delete note category
// @Description  Delete a note category by ID
// @Tags         note_category
// @Produce      json
// @Security     BearerAuth
// @Param        home_id path int true "Home ID"
// @Param        category_id path int true "Category ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /homes/{home_id}/note_categories/{category_id} [delete]
func (h *NoteHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "Invalid home ID", http.StatusBadRequest)
		return
	}

	categoryID, err := strconv.Atoi(chi.URLParam(r, "category_id"))
	if err != nil {
		utils.JSONError(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	// Verify category ownership/admin rights if applicable
	category, err := h.svc.GetCategoryByID(r.Context(), categoryID, homeID)
	if err != nil {
		utils.SafeError(w, err, "Failed to find category", http.StatusNotFound)
		return
	}
	if category.CreatedBy != userID {
		isAdmin, _ := h.homeRepo.IsAdmin(r.Context(), homeID, userID)
		if !isAdmin {
			utils.JSONError(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	if err := h.svc.DeleteCategory(r.Context(), categoryID, homeID); err != nil {
		utils.SafeError(w, err, "Failed to delete category", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  true,
		"message": "Category deleted successfully",
	})
}
