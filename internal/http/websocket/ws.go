package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/Dragodui/diploma-server/internal/config"
	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/repository"
	"github.com/Dragodui/diploma-server/pkg/security"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

const (
	pingInterval = 30 * time.Second
	pongTimeout  = 60 * time.Second
	authTimeout  = 10 * time.Second
)

type clientInfo struct {
	conn   *websocket.Conn
	userID int
	homeIDs []int
}

// handler for all ws connections
type WSHandler struct {
	Upgrader  websocket.Upgrader
	Clients   map[*websocket.Conn]*clientInfo
	Mu        sync.Mutex
	jwtSecret []byte
	homeRepo  repository.HomeRepository
}

func NewWSHandler(cfg *config.Config, homeRepo repository.HomeRepository) *WSHandler {
	return &WSHandler{
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				if cfg.Mode == "dev" {
					return true
				}

				// mobile clients (e.g. Expo Go) may not send an Origin header
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}

				allowedOrigins := []string{cfg.ClientURL, "http://" + cfg.ClientURL, "https://" + cfg.ClientURL}
				if cfg.WebURL != "" {
					allowedOrigins = append(allowedOrigins, cfg.WebURL, "http://"+cfg.WebURL, "https://"+cfg.WebURL)
				}
				for _, allowed := range allowedOrigins {
					if origin == allowed {
						return true
					}
				}

				return false
			},
		},
		Clients:   make(map[*websocket.Conn]*clientInfo),
		jwtSecret: []byte(cfg.JWTSecret),
		homeRepo:  homeRepo,
	}
}

// authMessage is the first message the client must send after connecting.
type authMessage struct {
	Token string `json:"token"`
}

func (h *WSHandler) HandleWS(w http.ResponseWriter, r *http.Request, cache *redis.Client) {
	// Support both query parameter (legacy) and first-message auth
	tokenStr := r.URL.Query().Get("token")

	conn, err := h.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	if tokenStr == "" {
		// First-message auth: read auth message within timeout
		conn.SetReadDeadline(time.Now().Add(authTimeout))
		_, msg, err := conn.ReadMessage()
		if err != nil {
			conn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "auth timeout"))
			conn.Close()
			return
		}

		var auth authMessage
		if err := json.Unmarshal(msg, &auth); err != nil || auth.Token == "" {
			conn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid auth message"))
			conn.Close()
			return
		}
		tokenStr = auth.Token
	}

	// Check if token has been revoked (logout)
	if val, err := cache.Exists(r.Context(), "blacklist:"+tokenStr).Result(); err == nil && val > 0 {
		conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "token revoked"))
		conn.Close()
		return
	}

	claims, err := security.ParseToken(tokenStr, h.jwtSecret)
	if err != nil {
		conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid token"))
		conn.Close()
		return
	}

	// Look up user's homes for scoped subscriptions
	homes, err := h.homeRepo.GetUserHomes(r.Context(), claims.UserID)
	if err != nil {
		log.Printf("Failed to get user homes for WS: %v", err)
		conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "internal error"))
		conn.Close()
		return
	}

	homeIDs := make([]int, len(homes))
	for i, home := range homes {
		homeIDs[i] = int(home.ID)
	}

	client := &clientInfo{
		conn:    conn,
		userID:  claims.UserID,
		homeIDs: homeIDs,
	}

	h.Mu.Lock()
	h.Clients[conn] = client
	h.Mu.Unlock()

	go h.readPump(conn)
	go h.subscribeToHomeChannels(client, cache)
}

// readPump reads from the connection to handle pong responses and detect disconnects.
func (h *WSHandler) readPump(conn *websocket.Conn) {
	defer h.removeClient(conn)

	conn.SetReadDeadline(time.Now().Add(pongTimeout))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongTimeout))
		return nil
	})

	for {
		// ReadMessage blocks until a message arrives or the connection errors out.
		// We discard client messages; this loop exists only to detect disconnects.
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// subscribeToHomeChannels subscribes to Redis channels for all homes the user belongs to.
func (h *WSHandler) subscribeToHomeChannels(client *clientInfo, cache *redis.Client) {
	defer h.removeClient(client.conn)

	if len(client.homeIDs) == 0 {
		// No homes — just keep connection alive for pings
		select {}
	}

	// Build channel list from user's home memberships
	channels := make([]string, len(client.homeIDs))
	for i, homeID := range client.homeIDs {
		channels[i] = event.HomeChannel(homeID)
	}
	// Also subscribe to user-specific updates channel
	channels = append(channels, fmt.Sprintf("user:%d:updates", client.userID))

	pubsub := cache.Subscribe(context.Background(), channels...)
	defer pubsub.Close()

	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	msgCh := pubsub.Channel()

	for {
		select {
		case msg, ok := <-msgCh:
			if !ok {
				return
			}
			if err := client.conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
				log.Printf("Error writing WS message: %v", err)
				return
			}
		case <-ticker.C:
			if err := client.conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(10*time.Second)); err != nil {
				log.Printf("Ping failed: %v", err)
				return
			}
		}
	}
}

// removeClient safely closes the connection and removes it from the client map.
func (h *WSHandler) removeClient(conn *websocket.Conn) {
	h.Mu.Lock()
	if _, ok := h.Clients[conn]; ok {
		delete(h.Clients, conn)
		conn.Close()
	}
	h.Mu.Unlock()
}
