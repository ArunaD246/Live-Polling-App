package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollHandler struct{}

func NewPollHandler() *PollHandler {
	return &PollHandler{}
}

func (h *PollHandler) CreatePoll(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required to create a poll"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)
	creatorName := c.GetString("name")

	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation error: " + err.Error()})
		return
	}

	// Backend Input Validation & Sanitization
	req.Question = strings.TrimSpace(req.Question)
	if len(req.Question) < 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Question must be at least 5 characters long"})
		return
	}

	if len(req.Options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll must contain at least 2 options"})
		return
	}
	if len(req.Options) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A poll cannot have more than 10 options"})
		return
	}

	// Verify options are non-empty and unique
	seenOptions := make(map[string]bool)
	var pollOptions []models.PollOption
	var optionIDs []string

	for idx, opt := range req.Options {
		trimmed := strings.TrimSpace(opt.Text)
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Option #%d cannot be blank", idx+1)})
			return
		}
		lower := strings.ToLower(trimmed)
		if seenOptions[lower] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate option found: '%s'", trimmed)})
			return
		}
		seenOptions[lower] = true

		optID := fmt.Sprintf("opt_%d", idx+1)
		optionIDs = append(optionIDs, optID)
		pollOptions = append(pollOptions, models.PollOption{
			ID:        optID,
			Text:      trimmed,
			VoteCount: 0,
		})
	}

	var expiresAt *time.Time
	if req.ExpiresInMins > 0 {
		exp := time.Now().Add(time.Duration(req.ExpiresInMins) * time.Minute)
		expiresAt = &exp
	}

	poll := &models.Poll{
		CreatorID:     userID,
		CreatorName:   creatorName,
		Question:      req.Question,
		Description:   strings.TrimSpace(req.Description),
		Options:       pollOptions,
		IsActive:      true,
		AllowMultiple: req.AllowMultiple,
		TotalVotes:    0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		ExpiresAt:     expiresAt,
	}

	if err := database.Mongo.CreatePoll(poll); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to persist poll: " + err.Error()})
		return
	}

	// Initialize Redis Hash for atomic tallies
	pollIDStr := poll.ID.Hex()
	_ = database.Redis.SetInitialOptionVotes(pollIDStr, optionIDs)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Poll created successfully",
		"poll":    poll,
	})
}

func (h *PollHandler) GetPoll(c *gin.Context) {
	idParam := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	poll, err := database.Mongo.FindPollByID(pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// Check expiration
	if poll.ExpiresAt != nil && time.Now().After(*poll.ExpiresAt) && poll.IsActive {
		poll.IsActive = false
		_ = database.Mongo.UpdatePollStatus(poll.ID, false)
	}

	// Read live counts from Redis (Redis driving realtime counts!)
	redisVotes, total, err := database.Redis.GetPollVotes(poll.ID.Hex())
	if err == nil && len(redisVotes) > 0 {
		poll.TotalVotes = total
		for i := range poll.Options {
			if count, ok := redisVotes[poll.Options[i].ID]; ok {
				poll.Options[i].VoteCount = count
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"poll": poll,
	})
}

func (h *PollHandler) GetMyPolls(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)

	polls, err := database.Mongo.FindPollsByCreator(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your polls"})
		return
	}

	// Sync Redis counts for each poll
	for i := range polls {
		redisVotes, total, err := database.Redis.GetPollVotes(polls[i].ID.Hex())
		if err == nil && len(redisVotes) > 0 {
			polls[i].TotalVotes = total
			for j := range polls[i].Options {
				if count, ok := redisVotes[polls[i].Options[j].ID]; ok {
					polls[i].Options[j].VoteCount = count
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"polls": polls,
	})
}

func (h *PollHandler) UpdatePollStatus(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)

	idParam := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	poll, err := database.Mongo.FindPollByID(pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if poll.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this poll"})
		return
	}

	var req models.UpdatePollStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.Mongo.UpdatePollStatus(pollID, req.IsActive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update poll status"})
		return
	}

	poll.IsActive = req.IsActive

	// Publish live update to Redis Pub/Sub so all connected WebSocket clients update immediately
	redisVotes, total, _ := database.Redis.GetPollVotes(pollID.Hex())
	_ = database.Redis.PublishPollUpdate(pollID.Hex(), models.LivePollUpdate{
		Type:       "STATUS_UPDATE",
		PollID:     pollID.Hex(),
		Votes:      redisVotes,
		TotalVotes: total,
		IsActive:   req.IsActive,
		Timestamp:  time.Now().Unix(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Poll status updated",
		"poll":    poll,
	})
}

func (h *PollHandler) DeletePoll(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)

	idParam := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	if err := database.Mongo.DeletePoll(pollID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Poll deleted successfully",
	})
}
