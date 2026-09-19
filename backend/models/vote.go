package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Vote struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID           primitive.ObjectID `bson:"poll_id" json:"poll_id"`
	OptionIDs        []string           `bson:"option_ids" json:"option_ids"`
	VoterFingerprint string             `bson:"voter_fingerprint" json:"voter_fingerprint"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
}

type CastVoteRequest struct {
	OptionIDs        []string `json:"option_ids" binding:"required,min=1"`
	VoterFingerprint string   `json:"voter_fingerprint" binding:"required"`
}

type LivePollUpdate struct {
	Type          string           `json:"type"` // "VOTE_UPDATE", "STATUS_UPDATE", "VIEWER_COUNT"
	PollID        string           `json:"poll_id"`
	Votes         map[string]int64 `json:"votes"`
	TotalVotes    int64            `json:"total_votes"`
	ActiveViewers int              `json:"active_viewers"`
	IsActive      bool             `json:"is_active"`
	Timestamp     int64            `json:"timestamp"`
}
