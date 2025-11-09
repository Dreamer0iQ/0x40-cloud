package router

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/config"
	"github.com/bhop_dynasty/0x40_cloud/internal/handler"
	"github.com/bhop_dynasty/0x40_cloud/internal/middleware"
	"github.com/bhop_dynasty/0x40_cloud/internal/repository"
	"github.com/bhop_dynasty/0x40_cloud/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(db *gorm.DB, cfg *config.Config) *gin.Engine {
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Apply CORS middleware
	r.Use(middleware.CORSMiddleware(cfg))

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	fileRepo := repository.NewFileRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg)
	fileService := service.NewFileService(fileRepo, cfg)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	fileHandler := handler.NewFileHandler(fileService)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// User routes
			protected.GET("/profile", authHandler.GetProfile)

			// File routes
			files := protected.Group("/files")
			{
				files.POST("/upload", fileHandler.Upload)
				files.GET("", fileHandler.GetUserFiles)
				files.GET("/:id", fileHandler.GetFile)
				files.DELETE("/:id", fileHandler.DeleteFile)
			}
		}
	}

	return r
}
