package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Dragodui/diploma-server/internal/http/middleware"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/services"
	"github.com/Dragodui/diploma-server/internal/utils"
)

type PushSubscriptionHandler struct {
	svc *services.PushSubscriptionService
}

func NewPushSubscriptionHandler(svc *services.PushSubscriptionService) *PushSubscriptionHandler {
	return &PushSubscriptionHandler{svc: svc}
}

func (h *PushSubscriptionHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var input models.PushSubscriptionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := utils.Validate.Struct(input); err != nil {
		utils.JSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.svc.SaveSubscription(r.Context(), userID, input); err != nil {
		utils.JSONError(w, "Failed to save subscription", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]string{"message": "Subscribed successfully"})
}

func (h *PushSubscriptionHandler) GetPublicKey(w http.ResponseWriter, r *http.Request) {
	// Typically we don't expose public key this way since the frontend can have it via env, 
	// but providing an endpoint is also standard practice.
	// But let's skip for now, since we only really need it injected via vite config or just env in react native.
	// Just return success for now if someone checks
}
