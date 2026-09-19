package database

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisService struct {
	client     *redis.Client
	isReal     bool
	ctx        context.Context
	// In-memory fallback for local dev when Redis service is not installed
	memVotes   map[string]map[string]int64
	memSub     map[string][]chan string
	memMu      sync.RWMutex
}

var Redis *RedisService

func InitRedis(addr, password, redisURL string) *RedisService {
	ctx := context.Background()
	service := &RedisService{
		ctx:      ctx,
		memVotes: make(map[string]map[string]int64),
		memSub:   make(map[string][]chan string),
	}

	var rdb *redis.Client

	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err == nil {
			if strings.HasPrefix(redisURL, "rediss://") {
				opt.TLSConfig = &tls.Config{InsecureSkipVerify: true}
			}
			rdb = redis.NewClient(opt)
		}
	} else if addr != "" {
		opts := &redis.Options{
			Addr:     addr,
			Password: password,
			DB:       0,
		}
		if strings.HasPrefix(addr, "rediss://") || strings.Contains(addr, "upstash") {
			opts.TLSConfig = &tls.Config{InsecureSkipVerify: true}
		}
		rdb = redis.NewClient(opts)
	}

	if rdb != nil {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		defer cancel()
		if err := rdb.Ping(pingCtx).Err(); err == nil {
			log.Println("Successfully connected to Redis at", rdb.Options().Addr)
			service.client = rdb
			service.isReal = true
			Redis = service
			return service
		} else {
			log.Printf("Could not connect to Redis (%v). Starting Redis in-memory engine fallback for local dev.", err)
		}
	} else {
		log.Println("No Redis connection configured. Starting Redis in-memory engine fallback for local dev.")
	}

	service.isReal = false
	Redis = service
	return service
}

func (s *RedisService) IsRealRedis() bool {
	return s.isReal
}

// IncrementOptionVote atomically increments the vote count in Redis Hash
func (s *RedisService) IncrementOptionVote(pollID, optionID string) (int64, error) {
	if s.isReal && s.client != nil {
		key := fmt.Sprintf("poll:%s:votes", pollID)
		count, err := s.client.HIncrBy(s.ctx, key, optionID, 1).Result()
		if err != nil {
			log.Printf("Redis HIncrBy error: %v", err)
			return 0, err
		}
		return count, nil
	}

	// Memory fallback
	s.memMu.Lock()
	defer s.memMu.Unlock()
	if _, ok := s.memVotes[pollID]; !ok {
		s.memVotes[pollID] = make(map[string]int64)
	}
	s.memVotes[pollID][optionID]++
	return s.memVotes[pollID][optionID], nil
}

// SetInitialOptionVotes initializes Redis Hash with 0 for options
func (s *RedisService) SetInitialOptionVotes(pollID string, optionIDs []string) error {
	if s.isReal && s.client != nil {
		key := fmt.Sprintf("poll:%s:votes", pollID)
		fields := make(map[string]interface{})
		for _, opt := range optionIDs {
			fields[opt] = 0
		}
		return s.client.HSet(s.ctx, key, fields).Err()
	}

	s.memMu.Lock()
	defer s.memMu.Unlock()
	if _, ok := s.memVotes[pollID]; !ok {
		s.memVotes[pollID] = make(map[string]int64)
	}
	for _, opt := range optionIDs {
		if _, exists := s.memVotes[pollID][opt]; !exists {
			s.memVotes[pollID][opt] = 0
		}
	}
	return nil
}

// GetPollVotes returns the current tallies from Redis
func (s *RedisService) GetPollVotes(pollID string) (map[string]int64, int64, error) {
	if s.isReal && s.client != nil {
		key := fmt.Sprintf("poll:%s:votes", pollID)
		res, err := s.client.HGetAll(s.ctx, key).Result()
		if err != nil {
			return nil, 0, err
		}
		votes := make(map[string]int64)
		var total int64
		for k, v := range res {
			count, _ := strconv.ParseInt(v, 10, 64)
			votes[k] = count
			total += count
		}
		return votes, total, nil
	}

	s.memMu.RLock()
	defer s.memMu.RUnlock()
	votes := make(map[string]int64)
	var total int64
	if pollMap, ok := s.memVotes[pollID]; ok {
		for k, v := range pollMap {
			votes[k] = v
			total += v
		}
	}
	return votes, total, nil
}

// PublishPollUpdate broadcasts an update to the poll's channel
func (s *RedisService) PublishPollUpdate(pollID string, payload interface{}) error {
	bytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	msg := string(bytes)

	if s.isReal && s.client != nil {
		channel := fmt.Sprintf("poll:%s:live", pollID)
		return s.client.Publish(s.ctx, channel, msg).Err()
	}

	s.memMu.RLock()
	subscribers := s.memSub[pollID]
	s.memMu.RUnlock()

	for _, ch := range subscribers {
		select {
		case ch <- msg:
		default:
		}
	}
	return nil
}

// SubscribePollChannel subscribes to live updates for a given poll
func (s *RedisService) SubscribePollChannel(pollID string, onMessage func(msg string), stopCh <-chan struct{}) {
	if s.isReal && s.client != nil {
		channel := fmt.Sprintf("poll:%s:live", pollID)
		pubsub := s.client.Subscribe(s.ctx, channel)
		defer pubsub.Close()

		ch := pubsub.Channel()
		for {
			select {
			case <-stopCh:
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				onMessage(msg.Payload)
			}
		}
	}

	// Memory fallback subscriber
	msgChan := make(chan string, 50)
	s.memMu.Lock()
	s.memSub[pollID] = append(s.memSub[pollID], msgChan)
	s.memMu.Unlock()

	defer func() {
		s.memMu.Lock()
		subs := s.memSub[pollID]
		for i, c := range subs {
			if c == msgChan {
				s.memSub[pollID] = append(subs[:i], subs[i+1:]...)
				break
			}
		}
		s.memMu.Unlock()
	}()

	for {
		select {
		case <-stopCh:
			return
		case msg := <-msgChan:
			onMessage(msg)
		}
	}
}
