package main

import (
	"log"

	"github.com/bhop_dynasty/0x40_cloud/internal/config"
	"github.com/bhop_dynasty/0x40_cloud/internal/handlers"
	"github.com/bhop_dynasty/0x40_cloud/internal/middleware"
	"github.com/bhop_dynasty/0x40_cloud/internal/models"
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

	redisClient, err := config.InitRedis(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
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

	// Repositories
	userRepo := repositories.NewUserRepository(db)
	fileRepo := repositories.NewFileRepository(db)
	starredRepo := repositories.NewStarredFileRepository(db)
	starredFolderRepo := repositories.NewStarredFolderRepository(db)
	sharedFileRepo := repositories.NewSharedFileRepository(db)

	// Services
	authService := services.NewAuthService(userRepo, cfg)
	fileService, err := services.NewFileService(fileRepo, starredRepo, starredFolderRepo, cfg.Storage.Path, cfg.Storage.EncryptionKey, cfg.Storage.Limit, cfg.Storage.MaxUploadSize)
	if err != nil {
		log.Fatalf("Failed to initialize file service: %v", err)
	}
	activityService := services.NewActivityService(redisClient, fileRepo)
	shareService := services.NewShareService(sharedFileRepo, fileRepo, fileService)

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	fileHandler := handlers.NewFileHandler(fileService, activityService)
	shareHandler := handlers.NewShareHandler(shareService)

	healthHandler := func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "0x40 cloud API is running",
		})
	}
	r.GET("/health", healthHandler)
	r.HEAD("/health", healthHandler)

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Public share routes
		public := api.Group("/public")
		{
			public.GET("/share/:token", shareHandler.GetSharedFile)
			public.GET("/share/:token/download", shareHandler.DownloadSharedFile)
		}

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			protected.GET("/auth/me", authHandler.GetMe)

			// Share management routes
			protected.POST("/files/:id/share", shareHandler.CreateShare)
			protected.GET("/shares", shareHandler.ListShares)
			protected.DELETE("/shares/:token", shareHandler.RevokeShare)

			// File routes - специфичные роуты должны идти ПЕРЕД :id параметрами
			protected.POST("/files/upload", fileHandler.Upload)
			protected.GET("/files/storage", fileHandler.GetStorageStats)
			protected.GET("/files", fileHandler.GetUserFiles)
			protected.GET("/files/by-path", fileHandler.GetFilesByPath)
			protected.GET("/files/recent", fileHandler.GetRecentFiles)
			protected.GET("/files/suggested", fileHandler.GetSuggestedFiles)
			protected.GET("/files/images", fileHandler.GetImages)
			protected.GET("/files/starred", fileHandler.GetStarredFiles)
			protected.GET("/files/trash", fileHandler.GetDeletedFiles)
			protected.GET("/files/download-folder", fileHandler.DownloadFolder)
			protected.POST("/files/folder", fileHandler.CreateFolder)
			protected.DELETE("/files/folder", fileHandler.DeleteFolder)
			protected.POST("/files/folder/star", fileHandler.ToggleStarredFolder)

			protected.POST("/files/:id/star", fileHandler.ToggleStarred)
			protected.GET("/files/:id/download", fileHandler.DownloadFile)
			protected.PATCH("/files/:id/rename", fileHandler.RenameFile)
			protected.PATCH("/files/:id/move", fileHandler.MoveFile)
			protected.DELETE("/files/:id", fileHandler.DeleteFile)
			protected.POST("/files/:id/restore", fileHandler.RestoreFile)
			protected.DELETE("/files/:id/permanent", fileHandler.DeleteFilePermanently)
		}
	}

	// Логируем все зарегистрированные роуты
	log.Println("📋 Registered routes:")
	for _, route := range r.Routes() {
		log.Printf("   %s %s", route.Method, route.Path)
	}

	log.Printf("🚀 Server starting on port %s...", cfg.Server.Port)
	log.Printf("📍 Environment: %s", cfg.Server.Env)
	log.Printf("🌐 CORS allowed origins: %v", cfg.CORS.AllowedOrigins)
	log.Printf("💾 Storage path: %s", cfg.Storage.Path)
	// Инициализация базы данных
	if err := db.AutoMigrate(&models.User{}, &models.File{}, &models.StarredFile{}, &models.StarredFolder{}, &models.SharedFile{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
