package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/Dragodui/diploma-server/internal/cache"
	"github.com/Dragodui/diploma-server/internal/config"
	"github.com/Dragodui/diploma-server/internal/database"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/metrics"
	"github.com/Dragodui/diploma-server/internal/router"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Server struct {
	router     http.Handler
	port       string
	httpServer *http.Server
	sqlCloser  interface{ Close() error }
	redis      interface{ Close() error }
}

func NewServer() (*Server, error) {
	logger.Init("app.log")
	cfg := config.Load()

	db, err := gorm.Open(postgres.Open(cfg.DB_DSN), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Register GORM metrics plugin
	if err := db.Use(&metrics.GormMetricsPlugin{}); err != nil {
		log.Printf("Warning: Failed to register GORM metrics plugin: %v", err)
	}

	if err = database.AutoMigrate(db); err != nil {
		return nil, err
	}

	// Seed database with test data
	// if err = database.SeedDatabase(db); err != nil {
	// 	log.Printf("Warning: Failed to seed database: %v", err)
	// }

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	cacheClient := cache.NewRedisClient(cfg.RedisADDR, cfg.RedisPassword, cfg.RedisTLS)

	app, err := newAppDeps(cfg, db, cacheClient)
	if err != nil {
		return nil, err
	}

	router := router.SetupRoutes(router.RoutesDeps{
		Config:   cfg,
		Handlers: app.handlers.RouterHandlers(),
		Cache:    cacheClient,
		HomeRepo: app.repos.home,
	})

	// Set startup metrics
	metrics.ServerStartTime.Set(float64(time.Now().Unix()))
	metrics.AppInfo.WithLabelValues("1.0.0", runtime.Version()).Set(1)

	// Start DB connection pool stats collector
	go collectDBPoolStats(sqlDB)

	// Start task schedule processor (checks every minute for due schedules)
	go runTaskScheduler(app.services.taskSchedule)
	go runTaskReminderScheduler(app.services.task)
	go runBillScheduler(app.services.bill)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	return &Server{
		router:     router,
		port:       cfg.Port,
		httpServer: httpServer,
		sqlCloser:  sqlDB,
		redis:      cacheClient,
	}, nil
}

func (a *Server) Run() error {
	logger.Info.Print("Starting server on port:", a.port)
	serveErr := make(chan error, 1)

	go func() {
		if err := a.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- err
		}
	}()

	sigCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case <-sigCtx.Done():
		logger.Info.Print("Shutdown signal received")
	case err := <-serveErr:
		return err
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := a.httpServer.Shutdown(shutdownCtx); err != nil {
		return err
	}

	var closeErrs []error
	if a.redis != nil {
		if err := a.redis.Close(); err != nil {
			closeErrs = append(closeErrs, err)
		}
	}
	if a.sqlCloser != nil {
		if err := a.sqlCloser.Close(); err != nil {
			closeErrs = append(closeErrs, err)
		}
	}

	return errors.Join(closeErrs...)
}
