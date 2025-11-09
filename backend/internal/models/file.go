package models

import (
	"time"

	"gorm.io/gorm"
)

type File struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID   uint   `gorm:"not null;index" json:"user_id"`
	Filename string `gorm:"not null" json:"filename"`
	Path     string `gorm:"not null" json:"path"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type FileUploadResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	URL      string `json:"url"`
}
