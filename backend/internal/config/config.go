package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	CORS     CORSConfig
	Storage  StorageConfig
	Auth     AuthConfig
}

type ServerConfig struct {
	Port string
	Env  string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret     string
	Expiration string
}

type CORSConfig struct {
	AllowedOrigins []string
}

type StorageConfig struct {
	Path          string
	EncryptionKey string
	Limit         int64
	MaxUploadSize int64
}

type AuthConfig struct {
	DisableRegistration bool
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Validate critical security settings
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" || jwtSecret == "change-this-secret-key" {
		log.Fatal("CRITICAL: JWT_SECRET must be set to a strong random value (not default). Generate with: openssl rand -base64 32")
	}

	encryptionKey := getEnv("ENCRYPTION_KEY", "")
	if encryptionKey == "" || encryptionKey == "12345678901234567890123456789012" {
		log.Fatal("CRITICAL: ENCRYPTION_KEY must be set to a strong 32-byte random value (not default). Generate with: openssl rand -hex 32")
	}

	if len(encryptionKey) != 32 {
		log.Fatalf("CRITICAL: ENCRYPTION_KEY must be exactly 32 bytes, got %d bytes", len(encryptionKey))
	}

	return &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Env:  getEnv("ENV", "development"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "0x40_cloud"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:     jwtSecret,
			Expiration: getEnv("JWT_EXPIRATION", "24h"),
		},
		CORS: CORSConfig{
			AllowedOrigins: strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000"), ","),
		},
	Storage: StorageConfig{
			Path:          getEnv("STORAGE_PATH", "./storage"),
			EncryptionKey: encryptionKey,
			Limit:         int64(getEnvAsInt("STORAGE_LIMIT_BYTES", 10*1024*1024*1024)),        // 10 GB default
			MaxUploadSize: int64(getEnvAsInt("MAX_UPLOAD_SIZE", 1*1024*1024*1024)),          // 1 GB default
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
		},
		Auth: AuthConfig{
			DisableRegistration: getEnvAsBool("DISABLE_REGISTRATION", false),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr != "" {
		if value, err := strconv.Atoi(valueStr); err == nil {
			return value
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := os.Getenv(key)
	if valueStr != "" {
		if value, err := strconv.ParseBool(valueStr); err == nil {
			return value
		}
	}
	return defaultValue
}
