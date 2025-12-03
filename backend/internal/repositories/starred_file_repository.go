package repositories

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StarredFileRepository struct {
	db *gorm.DB
}

func NewStarredFileRepository(db *gorm.DB) *StarredFileRepository {
	return &StarredFileRepository{db: db}
}

// Create добавляет файл в избранное
func (r *StarredFileRepository) Create(starredFile *models.StarredFile) error {
	return r.db.Create(starredFile).Error
}

// Delete удаляет файл из избранного
func (r *StarredFileRepository) Delete(userID uint, fileID uuid.UUID) error {
	return r.db.Where("user_id = ? AND file_id = ?", userID, fileID).Delete(&models.StarredFile{}).Error
}

// IsStarred проверяет, находится ли файл в избранном у пользователя
func (r *StarredFileRepository) IsStarred(userID uint, fileID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.StarredFile{}).Where("user_id = ? AND file_id = ?", userID, fileID).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// FindByUserID получает все избранные файлы пользователя
func (r *StarredFileRepository) FindByUserID(userID uint) ([]uuid.UUID, error) {
	var starredFiles []models.StarredFile
	err := r.db.Where("user_id = ?", userID).Find(&starredFiles).Error
	if err != nil {
		return nil, err
	}

	fileIDs := make([]uuid.UUID, len(starredFiles))
	for i, sf := range starredFiles {
		fileIDs[i] = sf.FileID
	}
	return fileIDs, nil
}

// FindStarredFilesByUserID получает все избранные файлы с полной информацией
func (r *StarredFileRepository) FindStarredFilesByUserID(userID uint) ([]models.File, error) {
	var files []models.File
	err := r.db.
		Joins("JOIN starred_files ON starred_files.file_id = files.id").
		Where("starred_files.user_id = ?", userID).
		Order("starred_files.starred_at DESC").
		Find(&files).Error
	return files, err
}

// GetStarredMap возвращает карту starred файлов для списка file IDs
func (r *StarredFileRepository) GetStarredMap(userID uint, fileIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	var starredFiles []models.StarredFile
	err := r.db.Where("user_id = ? AND file_id IN ?", userID, fileIDs).Find(&starredFiles).Error
	if err != nil {
		return nil, err
	}

	starredMap := make(map[uuid.UUID]bool)
	for _, sf := range starredFiles {
		starredMap[sf.FileID] = true
	}
	return starredMap, nil
}
