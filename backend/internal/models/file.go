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
	VirtualPath   string `gorm:"default:'/'" json:"virtual_path"`      // Виртуальный путь к файлу (например, /folder1/subfolder/)
	FolderName    string `gorm:"default:''" json:"folder_name"`        // Имя виртуальной папки, если файл загружен как часть папки
	SHA256        string `gorm:"not null;index;size:64" json:"sha256"` // SHA256 хеш оригинального файла
	MimeType      string `json:"mime_type"`
	Size          int64  `gorm:"not null" json:"size"`           // Размер оригинального файла
	EncryptedSize int64  `gorm:"not null" json:"encrypted_size"` // Размер зашифрованного файла

	User      User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	IsStarred bool `gorm:"-" json:"is_starred"` // Не сохраняется в БД, вычисляется динамически
}

type FileUploadResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	URL      string `json:"url"`
}

type StorageStats struct {
	TotalUsed int64 `json:"total_used"`
	ImageSize int64 `json:"image_size"`
	VideoSize int64 `json:"video_size"`
	DocSize   int64 `json:"doc_size"`
	OtherSize int64 `json:"other_size"`
	TrashSize int64 `json:"trash_size"`
	Limit         int64 `json:"limit"`
	PhysicalTotal int64 `json:"physical_total"`
	PhysicalFree  int64 `json:"physical_free"`
}
