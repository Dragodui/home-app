package notification

import (
	"context"
	"encoding/json"

	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/SherClockHolmes/webpush-go"
)

type PushService struct {
	repo       PushRepository
	publicKey  string
	privateKey string
	subject    string
}

func NewPushService(repo PushRepository, publicKey, privateKey, subject string) *PushService {
	return &PushService{
		repo:       repo,
		publicKey:  publicKey,
		privateKey: privateKey,
		subject:    subject,
	}
}

// PublicVAPIDKey returns configured VAPID public key
func (s *PushService) PublicVAPIDKey() string {
	return s.publicKey
}

func (s *PushService) SaveSubscription(ctx context.Context, userID int, input models.PushSubscriptionInput) error {
	sub := &models.PushSubscription{
		UserID:   userID,
		Endpoint: input.Endpoint,
		P256dh:   input.Keys.P256dh,
		Auth:     input.Keys.Auth,
	}
	return s.repo.Save(ctx, sub)
}

func (s *PushService) SendPushNotification(ctx context.Context, userID int, title, body string) error {
	subs, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return err
	}

	payload, err := json.Marshal(map[string]string{
		"title": title,
		"body":  body,
	})
	if err != nil {
		return err
	}

	for _, sub := range subs {
		wpSub := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}

		resp, err := webpush.SendNotification(payload, wpSub, &webpush.Options{
			Subscriber:      s.subject,
			VAPIDPublicKey:  s.publicKey,
			VAPIDPrivateKey: s.privateKey,
			TTL:             86400,
		})

		if err != nil {
			logger.Info.Printf("Failed to send push notification to %s: %v", sub.Endpoint, err)
			continue
		}
		if resp != nil {
			resp.Body.Close()
			if resp.StatusCode == 404 || resp.StatusCode == 410 {
				_ = s.repo.DeleteByEndpoint(ctx, sub.Endpoint)
			} else if resp.StatusCode >= 400 {
				logger.Info.Printf("Push service returned %d for %s", resp.StatusCode, sub.Endpoint)
			}
		}
	}

	return nil
}
