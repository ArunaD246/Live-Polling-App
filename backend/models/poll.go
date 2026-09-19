package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollOption struct {
	ID        string `bson:"id" json:"id"`
	Text      string `bson:"text" json:"text"`
	VoteCount int64  `bson:"vote_count" json:"vote_count"`
}

type Poll struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID     primitive.ObjectID `bson:"creator_id" json:"creator_id"`
	CreatorName   string             `bson:"creator_name" json:"creator_name"`
	Question      string             `bson:"question" json:"question"`
	Description   string             `bson:"description" json:"description"`
	Options       []PollOption       `bson:"options" json:"options"`
	IsActive      bool               `bson:"is_active" json:"is_active"`
	AllowMultiple bool               `bson:"allow_multiple" json:"allow_multiple"`
	TotalVotes    int64              `bson:"total_votes" json:"total_votes"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
	ExpiresAt     *time.Time         `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
}

type CreateOptionInput struct {
	Text string `json:"text" binding:"required,min=1,max=150"`
}

type CreatePollRequest struct {
	Question      string              `json:"question" binding:"required,min=5,max=250"`
	Description   string              `json:"description" binding:"max=500"`
	Options       []CreateOptionInput `json:"options" binding:"required,min=2,max=10"`
	AllowMultiple bool                `json:"allow_multiple"`
	ExpiresInMins int                 `json:"expires_in_mins"` // 0 means no expiration
}

type UpdatePollStatusRequest struct {
	IsActive bool `json:"is_active"`
}
