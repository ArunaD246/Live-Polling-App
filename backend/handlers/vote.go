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

type VoteHandler struct{}

func NewVoteHandler() *VoteHandler {
	return &VoteHandler{}
}

func (h *VoteHandler) CastVote(c *gin.Context) {
	idParam := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	var req models.CastVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vote request: " + err.Error()})
		return
	}

	req.VoterFingerprint = strings.TrimSpace(req.VoterFingerprint)
	if req.VoterFingerprint == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Voter identifier required"})
		return
	}

	// 1. Fetch poll to validate
	poll, err := database.Mongo.FindPollByID(pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// 2. Validate poll active status
	if !poll.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll is currently closed for voting"})
		return
	}

	// 3. Validate poll expiration
	if poll.ExpiresAt != nil && time.Now().After(*poll.ExpiresAt) {
		poll.IsActive = false
		_ = database.Mongo.UpdatePollStatus(poll.ID, false)
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll has expired"})
		return
	}

	// 4. Validate single vs multiple choice rule
	if !poll.AllowMultiple && len(req.OptionIDs) > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll only allows selecting a single option"})
		return
	}

	// 5. Validate that all selected options actually belong to this poll
	validOptions := make(map[string]bool)
	for _, opt := range poll.Options {
		validOptions[opt.ID] = true
	}

	selectedMap := make(map[string]bool)
	for _, optID := range req.OptionIDs {
		if !validOptions[optID] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid option ID '%s'", optID)})
			return
		}
		if selectedMap[optID] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot submit duplicate votes for the same option"})
			return
		}
		selectedMap[optID] = true
	}

	// 6. Prevent duplicate voting by fingerprint/token
	hasVoted, err := database.Mongo.HasVoted(pollID, req.VoterFingerprint)
	if err == nil && hasVoted {
		c.JSON(http.StatusConflict, gin.H{
			"error": "You have already cast your vote on this poll",
		})
		return
	}

	pollIDStr := pollID.Hex()

	// 7. REAL REDIS WORK: Atomically increment counts in Redis Hash (HINCRBY)
	for _, optID := range req.OptionIDs {
		if _, incrErr := database.Redis.IncrementOptionVote(pollIDStr, optID); incrErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record vote in realtime engine"})
			return
		}
	}

	// 8. Fetch current live tallies from Redis (HGETALL)
	redisVotes, total, _ := database.Redis.GetPollVotes(pollIDStr)

	// 9. Asynchronously persist vote log to MongoDB
	go func() {
		voteRecord := &models.Vote{
			PollID:           pollID,
			OptionIDs:        req.OptionIDs,
			VoterFingerprint: req.VoterFingerprint,
			CreatedAt:        time.Now(),
		}
		_ = database.Mongo.RecordVote(voteRecord)
	}()

	// 10. Broadcast live update to Redis Pub/Sub (driving real-time WebSockets!)
	liveUpdate := models.LivePollUpdate{
		Type:       "VOTE_UPDATE",
		PollID:     pollIDStr,
		Votes:      redisVotes,
		TotalVotes: total,
		IsActive:   poll.IsActive,
		Timestamp:  time.Now().Unix(),
	}
	_ = database.Redis.PublishPollUpdate(pollIDStr, liveUpdate)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Vote cast successfully",
		"votes":       redisVotes,
		"total_votes": total,
	})
}
