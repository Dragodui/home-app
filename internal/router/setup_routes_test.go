package router

import (
	"net/http"
	"testing"

	"github.com/Dragodui/diploma-server/internal/config"
	"github.com/Dragodui/diploma-server/internal/http/handlers"
	"github.com/stretchr/testify/assert"
)

func TestCorsAllowedOrigins_ProductionUsesConfiguredHTTPOrigins(t *testing.T) {
	cfg := &config.Config{
		Mode:      "prod",
		ClientURL: "https://app.example.com/callback",
		WebURL:    "https://web.example.com/",
		ServerURL: "https://api.example.com",
	}

	origins := corsAllowedOrigins(cfg)

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

	origins := corsAllowedOrigins(cfg)

	assert.Equal(t, []string{"https://app.example.com"}, origins)
}

func TestCorsAllowedOrigins_DevIncludesLocalOrigins(t *testing.T) {
	cfg := &config.Config{
		Mode:      "dev",
		ClientURL: "http://localhost:8081",
	}

	origins := corsAllowedOrigins(cfg)

	assert.Contains(t, origins, "http://localhost:8081")
	assert.Contains(t, origins, "http://127.0.0.1:8081")
	assert.NotContains(t, origins, "*")
}

func TestSetupRoutesIncludesPrivateBillsBeforeBillID(t *testing.T) {
	routes := collectRoutes(SetupRoutes(RoutesDeps{
		Config: &config.Config{
			Mode:      "dev",
			JWTSecret: "test-secret-with-more-than-32-chars",
		},
		Handlers: HandlerSet{
			Auth:         &handlers.AuthHandler{},
			Home:         &handlers.HomeHandler{},
			Task:         &handlers.TaskHandler{},
			TaskSchedule: &handlers.TaskScheduleHandler{},
			Bill:         &handlers.BillHandler{},
			BillCategory: &handlers.BillCategoryHandler{},
			Room:         &handlers.RoomHandler{},
			Shopping:     &handlers.ShoppingHandler{},
			Image:        &handlers.ImageHandler{},
			Poll:         &handlers.PollHandler{},
			Notification: &handlers.NotificationHandler{},
			Audit:        &handlers.AuditHandler{},
			User:         &handlers.UserHandler{},
			OCR:          &handlers.OCRHandler{},
			SmartHome:    &handlers.SmartHomeHandler{},
			PushSub:      &handlers.PushSubscriptionHandler{},
		},
	}))

	assert.Contains(t, routes, "GET /api/homes/{home_id}/bills/private")
}

func collectRoutes(handler http.Handler) []string {
	walker, ok := handler.(interface {
		Walk(func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error) error
	})
	if !ok {
		return nil
	}

	var routes []string
	_ = walker.Walk(func(method string, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		routes = append(routes, method+" "+route)
		return nil
	})
	return routes
}
