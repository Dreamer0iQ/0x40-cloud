package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type File struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID        uint   `gorm:"not null;index" json:"user_id"`
	Filename      string `gorm:"not null" json:"filename"`
	OriginalName  string `gorm:"not null" json:"original_name"`
	Path          string `gorm:"not null;index" json:"path"`           // Путь к зашифрованному файлу на диске
	SHA256        string `gorm:"not null;index;size:64" json:"sha256"` // SHA256 хеш оригинального файла
	MimeType      string `json:"mime_type"`
	Size          int64  `gorm:"not null" json:"size"`           // Размер оригинального файла
	EncryptedSize int64  `gorm:"not null" json:"encrypted_size"` // Размер зашифрованного файла

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type FileUploadResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	URL      string `json:"url"`
}
