package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	MongoURI      string
	MongoDBName   string
	RedisAddr     string
	RedisPassword string
	RedisURL      string
	JWTSecret     string
	ClientURL     string
}

func LoadConfig() *Config {
	// Try loading .env file if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mongoURI := os.Getenv("MONGO_URI")
	mongoDBName := os.Getenv("MONGO_DB_NAME")
	if mongoDBName == "" {
		mongoDBName = "livepolling"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisURL := os.Getenv("REDIS_URL")

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-live-polling-key-2026-secure"
	}

	clientURL := os.Getenv("CLIENT_URL")
	if clientURL == "" {
		clientURL = "http://localhost:5173"
	}

	return &Config{
		Port:          port,
		MongoURI:      mongoURI,
		MongoDBName:   mongoDBName,
		RedisAddr:     redisAddr,
		RedisPassword: redisPassword,
		RedisURL:      redisURL,
		JWTSecret:     jwtSecret,
		ClientURL:     clientURL,
	}
}
