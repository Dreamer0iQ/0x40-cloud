package repositories

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"gorm.io/gorm"
)

type StarredFolderRepository struct {
	db *gorm.DB
}

func NewStarredFolderRepository(db *gorm.DB) *StarredFolderRepository {
	return &StarredFolderRepository{db: db}
}

func (r *StarredFolderRepository) Create(starredFolder *models.StarredFolder) error {
	return r.db.Create(starredFolder).Error
}

func (r *StarredFolderRepository) Delete(userID uint, folderPath string) error {
	return r.db.Where("user_id = ? AND folder_path = ?", userID, folderPath).Delete(&models.StarredFolder{}).Error
}

func (r *StarredFolderRepository) IsStarred(userID uint, folderPath string) (bool, error) {
	var count int64
	err := r.db.Model(&models.StarredFolder{}).Where("user_id = ? AND folder_path = ?", userID, folderPath).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *StarredFolderRepository) GetStarredMap(userID uint, folderPaths []string) (map[string]bool, error) {
	var starredFolders []models.StarredFolder
	err := r.db.Where("user_id = ? AND folder_path IN ?", userID, folderPaths).Find(&starredFolders).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string]bool)
	for _, sf := range starredFolders {
		result[sf.FolderPath] = true
	}
	return result, nil
}

func (r *StarredFolderRepository) FindStarredFoldersByUserID(userID uint) ([]models.StarredFolder, error) {
	var folders []models.StarredFolder
	err := r.db.Where("user_id = ?", userID).Find(&folders).Error
	return folders, err
}
