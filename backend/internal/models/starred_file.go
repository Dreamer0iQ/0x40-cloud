package models

import (
	"time"

	"github.com/google/uuid"
)

type StarredFile struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	UserID    uint      `gorm:"not null;index:idx_user_file" json:"user_id"`
	FileID    uuid.UUID `gorm:"type:uuid;not null;index:idx_user_file" json:"file_id"`
	StarredAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"starred_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	File File `gorm:"foreignKey:FileID" json:"file,omitempty"`
}

// Уникальный индекс на комбинацию user_id и file_id
func (StarredFile) TableName() string {
	return "starred_files"
}
