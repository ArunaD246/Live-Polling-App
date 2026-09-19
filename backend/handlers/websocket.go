package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin WebSocket connections
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type PollHub struct {
	pollID        string
	clients       map[*websocket.Conn]bool
	broadcast     chan []byte
	register      chan *websocket.Conn
	unregister    chan *websocket.Conn
	stopSub       chan struct{}
	mu            sync.RWMutex
}

type WebSocketManager struct {
	hubs map[string]*PollHub
	mu   sync.RWMutex
}

var WSManager = &WebSocketManager{
	hubs: make(map[string]*PollHub),
}

func (m *WebSocketManager) getOrCreateHub(pollID string) *PollHub {
	m.mu.Lock()
	defer m.mu.Unlock()

	if hub, ok := m.hubs[pollID]; ok {
		return hub
	}

	hub := &PollHub{
		pollID:     pollID,
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte, 100),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		stopSub:    make(chan struct{}),
	}
	m.hubs[pollID] = hub

	// Run Hub loop
	go hub.run()

	// Subscribe Hub to Redis Pub/Sub for this poll
	go func() {
		database.Redis.SubscribePollChannel(pollID, func(msg string) {
			hub.broadcast <- []byte(msg)
		}, hub.stopSub)
	}()

	return hub
}

func (h *PollHub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			viewerCount := len(h.clients)
			h.mu.Unlock()

			// Broadcast viewer count update
			h.broadcastViewerCount(viewerCount)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			viewerCount := len(h.clients)
			h.mu.Unlock()

			// Broadcast updated viewer count
			h.broadcastViewerCount(viewerCount)

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					go func(c *websocket.Conn) {
						h.unregister <- c
					}(client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *PollHub) broadcastViewerCount(count int) {
	update := models.LivePollUpdate{
		Type:          "VIEWER_COUNT",
		PollID:        h.pollID,
		ActiveViewers: count,
		Timestamp:     time.Now().Unix(),
	}
	bytes, _ := json.Marshal(update)
	h.broadcast <- bytes
}

func HandleWebSocket(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing poll ID"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	hub := WSManager.getOrCreateHub(pollID)
	hub.register <- conn

	// Send initial state snapshot immediately to this new connection
	go func() {
		redisVotes, total, _ := database.Redis.GetPollVotes(pollID)
		objID, err := primitive.ObjectIDFromHex(pollID)
		isActive := true
		if err == nil {
			poll, pErr := database.Mongo.FindPollByID(objID)
			if pErr == nil && poll != nil {
				isActive = poll.IsActive
			}
		}

		hub.mu.RLock()
		viewers := len(hub.clients)
		hub.mu.RUnlock()

		snapshot := models.LivePollUpdate{
			Type:          "SNAPSHOT",
			PollID:        pollID,
			Votes:         redisVotes,
			TotalVotes:    total,
			ActiveViewers: viewers,
			IsActive:      isActive,
			Timestamp:     time.Now().Unix(),
		}
		if snapBytes, err := json.Marshal(snapshot); err == nil {
			_ = conn.WriteMessage(websocket.TextMessage, snapBytes)
		}
	}()

	// Keep alive reader
	go func() {
		defer func() {
			hub.unregister <- conn
		}()

		conn.SetReadLimit(512)
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}
