package config

import (
	"fmt"
	"log"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDatabase(cfg *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.Port,
		cfg.Database.SSLMode,
	)

	logLevel := logger.Silent
	if cfg.Server.Env == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("✓ Database connected successfully")

	// Запускаем миграции
	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}

func runMigrations(db *gorm.DB) error {
	log.Println("Running database migrations...")

	if err := db.AutoMigrate(
		&models.User{},
	); err != nil {
		return err
	}

	log.Println("✓ Migrations completed successfully")
	return nil
}
