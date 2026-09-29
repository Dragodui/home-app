package main

import (
	"time"

	"github.com/Dragodui/diploma-server/internal/modules/audit"
	"github.com/Dragodui/diploma-server/internal/modules/auth"
	"github.com/Dragodui/diploma-server/internal/modules/billing"
	"github.com/Dragodui/diploma-server/internal/modules/chat"
	"github.com/Dragodui/diploma-server/internal/modules/home"
	"github.com/Dragodui/diploma-server/internal/modules/image"
	"github.com/Dragodui/diploma-server/internal/modules/note"
	"github.com/Dragodui/diploma-server/internal/modules/notification"
	"github.com/Dragodui/diploma-server/internal/modules/poll"
	"github.com/Dragodui/diploma-server/internal/modules/room"
	"github.com/Dragodui/diploma-server/internal/modules/shopping"
	"github.com/Dragodui/diploma-server/internal/modules/smarthome"
	"github.com/Dragodui/diploma-server/internal/modules/task"
	"github.com/Dragodui/diploma-server/internal/modules/user"

	"github.com/Dragodui/diploma-server/internal/config"
	"github.com/Dragodui/diploma-server/internal/router"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/google"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type appDeps struct {
	cfg      *config.Config
	db       *gorm.DB
	cache    *redis.Client
	repos    repositories
	services serviceSet
	handlers handlerSet
}

type repositories struct {
	user         user.Repository
	home         home.Repository
	room         room.Repository
	task         task.Repository
	bill         billing.Repository
	billCategory billing.CategoryRepository
	shopping     shopping.Repository
	poll         poll.Repository
	notification notification.Repository
	audit        audit.Repository
	smartHome    smarthome.Repository
	taskSchedule task.ScheduleRepository
	pushSub      notification.PushRepository
	note         note.Repository
	chat         chat.Repository
}

type serviceSet struct {
	pushSub      *notification.PushService
	notification *notification.Service
	audit        *audit.Service
	auth         *auth.Service
	home         *home.Service
	room         *room.Service
	task         *task.Service
	bill         *billing.Service
	billCategory *billing.CategoryService
	shopping     *shopping.Service
	poll         *poll.Service
	user         *user.Service
	image        *image.Service
	ocr          *billing.OCRService
	smartHome    smarthome.IService
	taskSchedule *task.ScheduleService
	note         *note.Service
	chat         *chat.Service
}

type handlerSet struct {
	auth         *auth.Handler
	home         *home.Handler
	room         *room.Handler
	task         *task.Handler
	taskSchedule *task.ScheduleHandler
	bill         *billing.Handler
	billCategory *billing.CategoryHandler
	shopping     *shopping.Handler
	image        *image.Handler
	poll         *poll.Handler
	notification *notification.Handler
	audit        *audit.Handler
	user         *user.Handler
	ocr          *billing.OCRHandler
	smartHome    *smarthome.Handler
	pushSub      *notification.PushHandler
	note         *note.Handler
	chat         *chat.Handler
}

func newAppDeps(cfg *config.Config, db *gorm.DB, cache *redis.Client) (*appDeps, error) {
	app := &appDeps{
		cfg:   cfg,
		db:    db,
		cache: cache,
	}

	app.repos = newRepositories(db)

	services, err := newServices(cfg, cache, app.repos)
	if err != nil {
		return nil, err
	}
	app.services = services
	app.handlers = newHandlers(cfg, app.repos, app.services)

	return app, nil
}

func newRepositories(db *gorm.DB) repositories {
	return repositories{
		user:         user.NewRepository(db),
		home:         home.NewRepository(db),
		room:         room.NewRepository(db),
		task:         task.NewRepository(db),
		bill:         billing.NewRepository(db),
		billCategory: billing.NewCategoryRepository(db),
		shopping:     shopping.NewRepository(db),
		poll:         poll.NewRepository(db),
		notification: notification.NewRepository(db),
		audit:        audit.NewRepository(db),
		smartHome:    smarthome.NewRepository(db),
		taskSchedule: task.NewScheduleRepository(db),
		pushSub:      notification.NewPushRepository(db),
		note:         note.NewRepository(db),
		chat:         chat.NewRepository(db),
	}
}

func newServices(cfg *config.Config, cache *redis.Client, repos repositories) (serviceSet, error) {
	mailer := &utils.BrevoMailer{
		APIKey: cfg.BrevoAPIKey,
		From:   cfg.SMTPFrom,
	}

	goth.UseProviders(
		google.New(cfg.ClientID, cfg.ClientSecret, cfg.CallbackURL),
	)

	pushSubSvc := notification.NewPushService(repos.pushSub, cfg.VapidPublicKey, cfg.VapidPrivateKey, cfg.VapidSubject)
	notificationSvc := notification.NewService(repos.notification, cache, pushSubSvc, repos.home)
	auditSvc := audit.NewService(repos.audit)
	authSvc := auth.NewService(repos.user, []byte(cfg.JWTSecret), cache, 30*24*time.Hour, cfg.ClientURL, cfg.ServerURL, mailer)
	homeSvc := home.NewService(repos.home, cache, notificationSvc)
	roomSvc := room.NewService(repos.room, cache)
	taskSvc := task.NewService(repos.task, cache, notificationSvc)
	billSvc := billing.NewService(repos.bill, repos.billCategory, cache, notificationSvc, homeSvc)
	billCategorySvc := billing.NewCategoryService(repos.billCategory, cache)
	shoppingSvc := shopping.NewService(repos.shopping, cache)
	pollSvc := poll.NewService(repos.poll, cache, notificationSvc)
	userSvc := user.NewService(repos.user, cache)
	noteSvc := note.NewService(
		repos.note,
		repos.user,
		repos.home,
		repos.task,
		repos.bill,
		repos.billCategory,
		repos.shopping,
		cache,
	)

	chatSvc := chat.NewService(
		repos.chat,
		repos.home,
		repos.task,
		repos.bill,
		repos.billCategory,
		repos.shopping,
		repos.note,
		cache,
		notificationSvc,
	)

	imageSvc, err := image.NewService(cfg.R2S3Bucket, cfg.R2Region, cfg.R2AccountID, cfg.R2AccessKeyID, cfg.R2SecretAccessKey, cfg.R2PublicUrl)
	if err != nil {
		return serviceSet{}, err
	}

	return serviceSet{
		pushSub:      pushSubSvc,
		notification: notificationSvc,
		audit:        auditSvc,
		auth:         authSvc,
		home:         homeSvc,
		room:         roomSvc,
		task:         taskSvc,
		bill:         billSvc,
		billCategory: billCategorySvc,
		shopping:     shoppingSvc,
		poll:         pollSvc,
		user:         userSvc,
		image:        imageSvc,
		ocr:          billing.NewOCRService(cfg.GeminiAPIKey),
		smartHome:    smarthome.NewService(repos.smartHome, cache, cfg.HAEncryptionKey),
		taskSchedule: task.NewScheduleService(repos.taskSchedule, repos.task, cache, notificationSvc),
		note:         noteSvc,
		chat:         chatSvc,
	}, nil
}

func newHandlers(cfg *config.Config, repos repositories, services serviceSet) handlerSet {
	authHandler := auth.NewHandler(services.auth, cfg.ClientURL, cfg.Mode != "dev")
	authHandler.SetAuditService(services.audit)

	homeHandler := home.NewHandler(services.home)
	homeHandler.SetAuditService(services.audit)

	return handlerSet{
		auth:         authHandler,
		home:         homeHandler,
		room:         room.NewHandler(services.room, repos.home),
		task:         task.NewHandler(services.task, repos.home),
		taskSchedule: task.NewScheduleHandler(services.taskSchedule, repos.home),
		bill:         billing.NewHandler(services.bill, repos.home),
		billCategory: billing.NewCategoryHandler(services.billCategory, repos.home),
		shopping:     shopping.NewHandler(services.shopping, repos.home),
		image:        image.NewHandler(services.image),
		poll:         poll.NewHandler(services.poll, repos.home),
		notification: notification.NewHandler(services.notification),
		audit:        audit.NewHandler(services.audit),
		user:         user.NewHandler(services.user, services.image),
		ocr:          billing.NewOCRHandler(services.ocr),
		smartHome:    smarthome.NewHandler(services.smartHome),
		pushSub:      notification.NewPushHandler(services.pushSub),
		note:         note.NewHandler(services.note, repos.home),
		chat:         chat.NewHandler(services.chat, repos.home),
	}
}

func (h handlerSet) RouterHandlers() router.HandlerSet {
	return router.HandlerSet{
		Auth:         h.auth,
		Home:         h.home,
		Task:         h.task,
		TaskSchedule: h.taskSchedule,
		Bill:         h.bill,
		BillCategory: h.billCategory,
		Room:         h.room,
		Shopping:     h.shopping,
		Image:        h.image,
		Poll:         h.poll,
		Notification: h.notification,
		Audit:        h.audit,
		User:         h.user,
		OCR:          h.ocr,
		SmartHome:    h.smartHome,
		PushSub:      h.pushSub,
		Note:         h.note,
		Chat:         h.chat,
	}
}
