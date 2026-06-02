package handlers

import (
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/Dragodui/diploma-server/internal/http/middleware"
	"github.com/Dragodui/diploma-server/internal/services"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/go-chi/chi/v5"
)

type AuditHandler struct {
	svc services.IAuditService
}

func NewAuditHandler(svc services.IAuditService) *AuditHandler {
	return &AuditHandler{svc: svc}
}

func (h *AuditHandler) GetByHomeID(w http.ResponseWriter, r *http.Request) {
	homeID, err := strconv.Atoi(chi.URLParam(r, "home_id"))
	if err != nil {
		utils.JSONError(w, "invalid home ID", http.StatusBadRequest)
		return
	}

	limit := parseAuditLimit(r)
	events, err := h.svc.GetByHomeID(r.Context(), homeID, limit)
	if err != nil {
		utils.SafeError(w, err, "Failed to retrieve audit events", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{"status": true, "events": events})
}

func (h *AuditHandler) GetMyEvents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == 0 {
		utils.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := parseAuditLimit(r)
	events, err := h.svc.GetByActorID(r.Context(), userID, limit)
	if err != nil {
		utils.SafeError(w, err, "Failed to retrieve audit events", http.StatusInternalServerError)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{"status": true, "events": events})
}

func parseAuditLimit(r *http.Request) int {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	return limit
}

func AuditRequestIP(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value == "" {
			continue
		}
		if header == "X-Forwarded-For" {
			value = strings.TrimSpace(strings.Split(value, ",")[0])
		}
		if value != "" {
			return value
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func AuditUserAgent(r *http.Request) string {
	return r.UserAgent()
}
