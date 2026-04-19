package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	Mode string
	// DB
	DB_DSN string

	// AUTH
	JWTSecret    string
	Port         string
	ClientID     string
	ClientSecret string
	CallbackURL  string
	ClientURL    string
	WebURL       string
	ServerURL    string

	// REDIS
	RedisADDR     string
	RedisPassword string
	RedisTLS      bool

	// SMTP (legacy, kept for local dev)
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	// Brevo API
	BrevoAPIKey string

	// R2
	R2Region          string
	R2S3Bucket        string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2PublicUrl       string
	R2AccountID       string
	// ADMIN (for /metrics and /swagger)
	AdminUsername string
	AdminPassword string

	// Home Assistant token encryption key (32 bytes for AES-256)
	HAEncryptionKey string

	// Gemini API key for receipt OCR
	GeminiAPIKey string

	// VAPID keys for Web Push Notifications
	VapidPublicKey  string
	VapidPrivateKey string
	VapidSubject    string
}

func Load() *Config {
	// Load .env file explicitly from the mounted volume path
	// if os.Getenv("MODE") == "dev" {
	// 	if err := godotenv.Load("/app/.env"); err != nil {
	// 		log.Println("Error loading .env file:", err.Error())
	// 		log.Fatal(".env file is not exist or load incorrectly")
	// 	}
	// }

	redisTLS := true
	redisTLSStr := os.Getenv("REDIS_TLS")
	if redisTLSStr != "true" {
		redisTLS = false
	}

	// Parse optional SMTP port (not required when using Brevo API)
	smtpPort, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))

	// Initialize configuration struct using determined keys
	cfg := &Config{
		Mode:         getEnv("MODE", "dev"),
		DB_DSN:       getEnvRequired("DB_DSN"),
		JWTSecret:    getEnvRequired("JWT_SECRET"),
		Port:         getEnv("PORT", "8000"),
		ClientID:     getEnvRequired("GOOGLE_CLIENT_ID"),
		ClientSecret: getEnvRequired("GOOGLE_CLIENT_SECRET"),
		CallbackURL:  getEnvRequired("CLIENT_CALLBACK_URL"),
		ClientURL:    getEnvRequired("CLIENT_URL"),
		WebURL:       getEnv("WEB_URL", ""),
		ServerURL:    getEnvRequired("SERVER_URL"),

		RedisADDR:     getEnvRequired("REDIS_ADDR"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisTLS:      redisTLS,

		SMTPHost: getEnv("SMTP_HOST", ""),
		SMTPPort: smtpPort,
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom: getEnv("SMTP_FROM", ""),

		BrevoAPIKey: getEnvRequired("BREVO_API_KEY"),

		R2AccessKeyID:     getEnvRequired("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey: getEnvRequired("R2_SECRET_ACCESS_KEY"),
		R2S3Bucket:        getEnvRequired("R2_S3_BUCKET"),
		R2Region:          getEnv("R2_REGION", "auto"),

		// r2
		R2PublicUrl: getEnvRequired("R2_PUBLIC_URL"),
		R2AccountID: getEnvRequired("R2_ACCOUNT_ID"),

		// Admin credentials for /metrics and /swagger
		AdminUsername: getEnvRequired("ADMIN_USERNAME"),
		AdminPassword: getEnvRequired("ADMIN_PASSWORD"),

		// Home Assistant token encryption (must be exactly 32 characters for AES-256)
		HAEncryptionKey: getEnvRequired("HA_ENCRYPTION_KEY"),

		// Gemini API for receipt OCR
		GeminiAPIKey: getEnv("GEMINI_API_KEY", ""),

		// VAPID keys for Web Push Notifications
		VapidPublicKey:  getEnvRequired("VAPID_PUBLIC_KEY"),
		VapidPrivateKey: getEnvRequired("VAPID_PRIVATE_KEY"),
		VapidSubject:    getEnv("VAPID_SUBJECT", "mailto:contact@example.com"),
	}

	// Validate security-critical config values
	if len(cfg.JWTSecret) < 32 {
		log.Fatal("SECURITY: JWT_SECRET must be at least 32 characters long")
	}

	if len(cfg.HAEncryptionKey) != 32 {
		log.Fatal("SECURITY: HA_ENCRYPTION_KEY must be exactly 32 characters for AES-256")
	}

	return cfg
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvRequired(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("Required environment variable %s is not set", key)
	}
	return value
}
