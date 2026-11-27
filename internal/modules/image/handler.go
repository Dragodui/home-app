package image

import (
	"net/http"

	"github.com/Dragodui/diploma-server/internal/utils"
)

type Handler struct {
	svc IService
}

func NewHandler(svc IService) *Handler {
	return &Handler{svc: svc}
}

// UploadImage godoc
// @Summary      Upload an image
// @Description  Upload an image file
// @Tags         image
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        image formData file true "Image File"
// @Param        visibility query string false "public (permanent link, e.g. avatars) or private (expiring links, default)"
// @Success      201  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /upload [post]
func (h *Handler) UploadImage(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10mb file limit

	if err != nil {
		utils.SafeError(w, err, "Error uploading image", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		utils.SafeError(w, err, "File required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	visibility, err := ParseVisibility(r.URL.Query().Get("visibility"))
	if err != nil {
		utils.JSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	publicPath, err := h.svc.Upload(r.Context(), file, header, visibility)

	if err != nil {
		utils.SafeError(w, err, "Failed to upload image", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusCreated, map[string]interface{}{
		"status":  true,
		"message": "File uploaded successfully",
		"url":     publicPath,
	})
}
