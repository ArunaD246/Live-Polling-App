package main

import (
	"log"
	"net/http"

	"backend/config"
	"backend/database"
	"backend/handlers"
	"backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize Database Services
	mongoService := database.InitMongo(cfg.MongoURI, cfg.MongoDBName)
	redisService := database.InitRedis(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisURL)

	log.Printf("Live Polling Backend starting... (Mongo Live: %v, Redis Live: %v)", 
		mongoService.IsRealMongo(), redisService.IsRealRedis())

	// Gin Engine Setup
	r := gin.Default()

	// Global CORS
	r.Use(middleware.CORSMiddleware(cfg.ClientURL))

	// System Health Check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":     "healthy",
			"mongo_live": database.Mongo.IsRealMongo(),
			"redis_live": database.Redis.IsRealRedis(),
			"service":    "Live Polling Engine (Go/Gin)",
		})
	})

	// Handlers
	authHandler := handlers.NewAuthHandler(cfg)
	pollHandler := handlers.NewPollHandler()
	voteHandler := handlers.NewVoteHandler()

	// Public Routes
	api := r.Group("/api")
	{
		// Auth
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)

		// Public Poll Details & Voting
		api.GET("/polls/:id", pollHandler.GetPoll)
		api.POST("/polls/:id/vote", voteHandler.CastVote)

		// Protected Poll Management Routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			protected.GET("/auth/me", authHandler.Me)
			protected.POST("/polls", pollHandler.CreatePoll)
			protected.GET("/polls/my", pollHandler.GetMyPolls)
			protected.PATCH("/polls/:id/status", pollHandler.UpdatePollStatus)
			protected.DELETE("/polls/:id", pollHandler.DeletePoll)
		}
	}

	// Real-time WebSocket Endpoint
	r.GET("/ws/polls/:id", handlers.HandleWebSocket)

	log.Printf("Server listening on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
