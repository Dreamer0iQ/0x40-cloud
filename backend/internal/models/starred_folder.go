package models

import (
	"time"
)

type StarredFolder struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	UserID     uint      `gorm:"not null;index:idx_user_folder" json:"user_id"`
	FolderPath string    `gorm:"type:text;not null;index:idx_user_folder" json:"folder_path"` // Full path like /foo/bar/
	StarredAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"starred_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (StarredFolder) TableName() string {
	return "starred_folders"
}
