package router_test

import (
	"net/http"
	"testing"

	"github.com/Dragodui/diploma-server/internal/modules/audit"
	"github.com/Dragodui/diploma-server/internal/modules/auth"
	"github.com/Dragodui/diploma-server/internal/modules/billing"
	"github.com/Dragodui/diploma-server/internal/modules/home"
	"github.com/Dragodui/diploma-server/internal/modules/image"
	"github.com/Dragodui/diploma-server/internal/modules/notification"
	"github.com/Dragodui/diploma-server/internal/modules/poll"
	"github.com/Dragodui/diploma-server/internal/modules/room"
	"github.com/Dragodui/diploma-server/internal/modules/shopping"
	"github.com/Dragodui/diploma-server/internal/modules/smarthome"
	"github.com/Dragodui/diploma-server/internal/modules/task"
	"github.com/Dragodui/diploma-server/internal/modules/user"
	"github.com/Dragodui/diploma-server/internal/router"

	"github.com/Dragodui/diploma-server/internal/config"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
)

func TestCorsAllowedOrigins_ProductionUsesConfiguredHTTPOrigins(t *testing.T) {
	cfg := &config.Config{
		Mode:      "prod",
		ClientURL: "https://app.example.com/callback",
		WebURL:    "https://web.example.com/",
		ServerURL: "https://api.example.com",
	}

	origins := router.CorsAllowedOrigins(cfg)

	assert.Equal(t, []string{
		"https://app.example.com",
		"https://web.example.com",
	}, origins)
}

func TestCorsAllowedOrigins_DeduplicatesAndSkipsNonHTTPOrigins(t *testing.T) {
	cfg := &config.Config{
		Mode:      "prod",
		ClientURL: "https://app.example.com/login",
		WebURL:    "exp://localhost:8081",
	}

	origins := router.CorsAllowedOrigins(cfg)

	assert.Equal(t, []string{"https://app.example.com"}, origins)
}

func TestCorsAllowedOrigins_DevIncludesLocalOrigins(t *testing.T) {
	cfg := &config.Config{
		Mode:      "dev",
		ClientURL: "http://localhost:8081",
	}

	origins := router.CorsAllowedOrigins(cfg)

	assert.Contains(t, origins, "http://localhost:8081")
	assert.Contains(t, origins, "http://127.0.0.1:8081")
	assert.NotContains(t, origins, "*")
}

func TestSetupRoutesIncludesPrivateBills(t *testing.T) {
	routes := collectRoutes(newTestRouter())

	assert.Contains(t, routes, "GET /api/homes/{home_id}/bills/private")
}

func TestSetupRoutesBuildsApplicationRouter(t *testing.T) {
	assert.NotNil(t, newTestRouter())
}

func newTestRouter() http.Handler {
	return router.SetupRoutes(router.RoutesDeps{
		Config: &config.Config{
			Mode:      "dev",
			JWTSecret: "test-secret-with-more-than-32-chars",
		},
		Handlers: router.HandlerSet{
			Auth:         &auth.Handler{},
			Home:         &home.Handler{},
			Task:         &task.Handler{},
			TaskSchedule: &task.ScheduleHandler{},
			Bill:         &billing.Handler{},
			BillCategory: &billing.CategoryHandler{},
			Room:         &room.Handler{},
			Shopping:     &shopping.Handler{},
			Image:        &image.Handler{},
			Poll:         &poll.Handler{},
			Notification: &notification.Handler{},
			Audit:        &audit.Handler{},
			User:         &user.Handler{},
			OCR:          &billing.OCRHandler{},
			SmartHome:    &smarthome.Handler{},
			PushSub:      &notification.PushHandler{},
		},
	})
}

func collectRoutes(handler http.Handler) []string {
	routesHandler, ok := handler.(chi.Routes)
	if !ok {
		return nil
	}

	var routes []string
	_ = chi.Walk(routesHandler, func(method string, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		routes = append(routes, method+" "+route)
		return nil
	})
	return routes
}
