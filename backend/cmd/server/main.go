package main

import (
	"log"

	"github.com/bhop_dynasty/0x40_cloud/internal/config"
	"github.com/bhop_dynasty/0x40_cloud/internal/handlers"
	"github.com/bhop_dynasty/0x40_cloud/internal/middleware"
	"github.com/bhop_dynasty/0x40_cloud/internal/repositories"
	"github.com/bhop_dynasty/0x40_cloud/internal/services"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	log.Println("✓ Configuration loaded")

	db, err := config.InitDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.CORS.AllowedOrigins
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(corsConfig))

	userRepo := repositories.NewUserRepository(db)
	authService := services.NewAuthService(userRepo, cfg)
	authHandler := handlers.NewAuthHandler(authService)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "0x40 cloud API is running",
		})
	})

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			protected.GET("/auth/me", authHandler.GetMe)
		}
	}

	log.Printf("🚀 Server starting on port %s...", cfg.Server.Port)
	log.Printf("📍 Environment: %s", cfg.Server.Env)
	log.Printf("🌐 CORS allowed origins: %v", cfg.CORS.AllowedOrigins)

	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
