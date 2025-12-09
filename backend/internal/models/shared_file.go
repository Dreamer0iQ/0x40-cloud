package models

import (
	"time"

	"github.com/google/uuid"
)

type SharedFile struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	FileID    uuid.UUID `gorm:"not null;index" json:"file_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Downloads int       `gorm:"default:0" json:"downloads"`
	Limit     *int      `json:"limit"`     // nil means unlimited
	ExpiresAt *time.Time `json:"expires_at"` // nil means never expires

	File File `gorm:"foreignKey:FileID" json:"file,omitempty"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type CreateShareRequest struct {
	Limit     *int       `json:"limit"`
	ExpiresAt *time.Time `json:"expires_at"`
}
