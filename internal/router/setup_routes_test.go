package router

import (
	"testing"

	"github.com/Dragodui/diploma-server/internal/config"
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
