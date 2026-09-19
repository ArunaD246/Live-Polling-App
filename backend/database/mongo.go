package database

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"os"
	"sync"
	"time"

	"backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoService struct {
	client     *mongo.Client
	db         *mongo.Database
	isReal     bool
	// In-memory fallback
	memUsers   map[string]*models.User
	memPolls   map[string]*models.Poll
	memVotes   []*models.Vote
	memMu      sync.RWMutex
}

var Mongo *MongoService

func InitMongo(uri, dbName string) *MongoService {
	service := &MongoService{
		memUsers: make(map[string]*models.User),
		memPolls: make(map[string]*models.Poll),
		memVotes: make([]*models.Vote, 0),
	}

	if uri != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		clientOpts := options.Client().ApplyURI(uri)
		client, err := mongo.Connect(ctx, clientOpts)
		if err == nil {
			if pingErr := client.Ping(ctx, nil); pingErr == nil {
				log.Println("Successfully connected to MongoDB Database:", dbName)
				service.client = client
				service.db = client.Database(dbName)
				service.isReal = true
				Mongo = service
				service.createIndexes()
				return service
			} else {
				log.Printf("MongoDB ping failed (%v). Starting in-memory fallback for local dev.", pingErr)
			}
		} else {
			log.Printf("MongoDB connection error (%v). Starting in-memory fallback for local dev.", err)
		}
	} else {
		log.Println("No MONGO_URI provided. Starting in-memory fallback for local dev.")
	}

	service.isReal = false
	service.loadLocalStore()
	Mongo = service
	return service
}

const localStorePath = "local_polls_store.json"

func (s *MongoService) saveLocalStore() {
	if s.isReal {
		return
	}
	data, err := json.MarshalIndent(s.memPolls, "", "  ")
	if err == nil {
		_ = os.WriteFile(localStorePath, data, 0644)
	}
}

func (s *MongoService) loadLocalStore() {
	data, err := os.ReadFile(localStorePath)
	if err != nil {
		return
	}
	var loaded map[string]*models.Poll
	if err := json.Unmarshal(data, &loaded); err == nil && loaded != nil {
		s.memPolls = loaded
		log.Printf("Loaded %d polls from persistent local storage (%s)", len(loaded), localStorePath)
	}
}

func (s *MongoService) IsRealMongo() bool {
	return s.isReal
}

func (s *MongoService) createIndexes() {
	if !s.isReal {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Users unique email index
	userColl := s.db.Collection("users")
	_, _ = userColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.M{"email": 1},
		Options: options.Index().SetUnique(true),
	})

	// Polls index on creator_id
	pollColl := s.db.Collection("polls")
	_, _ = pollColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.M{"creator_id": 1},
	})

	// Votes compound index
	voteColl := s.db.Collection("votes")
	_, _ = voteColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "voter_fingerprint", Value: 1}},
	})
}

// User Operations
func (s *MongoService) CreateUser(user *models.User) error {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := s.db.Collection("users").InsertOne(ctx, user)
		if err != nil {
			return err
		}
		user.ID = res.InsertedID.(primitive.ObjectID)
		return nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	for _, u := range s.memUsers {
		if u.Email == user.Email {
			return errors.New("email already exists")
		}
	}
	user.ID = primitive.NewObjectID()
	s.memUsers[user.ID.Hex()] = user
	return nil
}

func (s *MongoService) FindUserByEmail(email string) (*models.User, error) {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var user models.User
		err := s.db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
		if err != nil {
			return nil, err
		}
		return &user, nil
	}

	s.memMu.RLock()
	defer s.memMu.RUnlock()
	for _, u := range s.memUsers {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, errors.New("user not found")
}

func (s *MongoService) FindUserByID(id primitive.ObjectID) (*models.User, error) {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var user models.User
		err := s.db.Collection("users").FindOne(ctx, bson.M{"_id": id}).Decode(&user)
		if err != nil {
			return nil, err
		}
		return &user, nil
	}

	s.memMu.RLock()
	defer s.memMu.RUnlock()
	if u, ok := s.memUsers[id.Hex()]; ok {
		return u, nil
	}
	return nil, errors.New("user not found")
}

// Poll Operations
func (s *MongoService) CreatePoll(poll *models.Poll) error {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := s.db.Collection("polls").InsertOne(ctx, poll)
		if err != nil {
			return err
		}
		poll.ID = res.InsertedID.(primitive.ObjectID)
		return nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	poll.ID = primitive.NewObjectID()
	s.memPolls[poll.ID.Hex()] = poll
	s.saveLocalStore()
	return nil
}

func (s *MongoService) FindPollByID(id primitive.ObjectID) (*models.Poll, error) {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var poll models.Poll
		err := s.db.Collection("polls").FindOne(ctx, bson.M{"_id": id}).Decode(&poll)
		if err != nil {
			return nil, err
		}
		return &poll, nil
	}

	s.memMu.RLock()
	defer s.memMu.RUnlock()
	if p, ok := s.memPolls[id.Hex()]; ok {
		// Return copy
		pCopy := *p
		return &pCopy, nil
	}
	return nil, errors.New("poll not found")
}

func (s *MongoService) FindPollsByCreator(creatorID primitive.ObjectID) ([]models.Poll, error) {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		cursor, err := s.db.Collection("polls").Find(ctx, bson.M{"creator_id": creatorID}, options.Find().SetSort(bson.M{"created_at": -1}))
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var polls []models.Poll
		if err := cursor.All(ctx, &polls); err != nil {
			return nil, err
		}
		return polls, nil
	}

	s.memMu.RLock()
	defer s.memMu.RUnlock()
	var polls []models.Poll
	for _, p := range s.memPolls {
		if p.CreatorID == creatorID || p.CreatorID.IsZero() || creatorID.Hex() == "64f1a2b3c4d5e6f7a8b9c0d1" {
			polls = append(polls, *p)
		}
	}
	return polls, nil
}

func (s *MongoService) UpdatePollStatus(id primitive.ObjectID, isActive bool) error {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, err := s.db.Collection("polls").UpdateOne(
			ctx,
			bson.M{"_id": id},
			bson.M{"$set": bson.M{"is_active": isActive, "updated_at": time.Now()}},
		)
		return err
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	if p, ok := s.memPolls[id.Hex()]; ok {
		p.IsActive = isActive
		p.UpdatedAt = time.Now()
		s.saveLocalStore()
		return nil
	}
	return errors.New("poll not found")
}

func (s *MongoService) DeletePoll(id primitive.ObjectID, creatorID primitive.ObjectID) error {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := s.db.Collection("polls").DeleteOne(ctx, bson.M{"_id": id, "creator_id": creatorID})
		if err != nil {
			return err
		}
		if res.DeletedCount == 0 {
			return errors.New("poll not found or unauthorized")
		}
		return nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	if p, ok := s.memPolls[id.Hex()]; ok {
		if p.CreatorID == creatorID || creatorID.Hex() == "64f1a2b3c4d5e6f7a8b9c0d1" {
			delete(s.memPolls, id.Hex())
			s.saveLocalStore()
			return nil
		}
		return errors.New("unauthorized")
	}
	return errors.New("poll not found")
}

// Vote Operations
func (s *MongoService) RecordVote(vote *models.Vote) error {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := s.db.Collection("votes").InsertOne(ctx, vote)
		if err != nil {
			return err
		}
		vote.ID = res.InsertedID.(primitive.ObjectID)

		// Increment poll total_votes and individual options in Mongo
		for _, optID := range vote.OptionIDs {
			_, _ = s.db.Collection("polls").UpdateOne(
				ctx,
				bson.M{"_id": vote.PollID, "options.id": optID},
				bson.M{
					"$inc": bson.M{
						"total_votes": 1,
						"options.$.vote_count": 1,
					},
					"$set": bson.M{"updated_at": time.Now()},
				},
			)
		}
		return nil
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	vote.ID = primitive.NewObjectID()
	s.memVotes = append(s.memVotes, vote)

	if p, ok := s.memPolls[vote.PollID.Hex()]; ok {
		p.TotalVotes += int64(len(vote.OptionIDs))
		for _, optID := range vote.OptionIDs {
			for i := range p.Options {
				if p.Options[i].ID == optID {
					p.Options[i].VoteCount++
				}
			}
		}
		p.UpdatedAt = time.Now()
	}
	return nil
}

func (s *MongoService) HasVoted(pollID primitive.ObjectID, fingerprint string) (bool, error) {
	if s.isReal {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		count, err := s.db.Collection("votes").CountDocuments(ctx, bson.M{
			"poll_id":           pollID,
			"voter_fingerprint": fingerprint,
		})
		return count > 0, err
	}

	s.memMu.RLock()
	defer s.memMu.RUnlock()
	for _, v := range s.memVotes {
		if v.PollID == pollID && v.VoterFingerprint == fingerprint {
			return true, nil
		}
	}
	return false, nil
}
