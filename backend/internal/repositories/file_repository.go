package repositories

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) *FileRepository {
	return &FileRepository{db: db}
}

func (r *FileRepository) Create(file *models.File) error {
	return r.db.Create(file).Error
}

func (r *FileRepository) FindByID(id uuid.UUID) (*models.File, error) {
	var file models.File
	err := r.db.Preload("User").Where("id = ?", id).First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

func (r *FileRepository) FindByUserID(userID uint) ([]models.File, error) {
	var files []models.File
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&files).Error
	return files, err
}

func (r *FileRepository) FindByIDs(fileIDs []uuid.UUID, userID uint) ([]models.File, error) {
	var files []models.File
	err := r.db.Where("id IN ? AND user_id = ?", fileIDs, userID).Find(&files).Error
	return files, err
}

func (r *FileRepository) FindRecentByUserID(userID uint, limit int) ([]models.File, error) {
	var files []models.File
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&files).Error
	return files, err
}

func (r *FileRepository) FindBySHA256AndUserID(sha256 string, userID uint) (*models.File, error) {
	var file models.File
	err := r.db.Where("sha256 = ? AND user_id = ?", sha256, userID).First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

func (r *FileRepository) CountBySHA256(sha256 string) (int64, error) {
	var count int64
	err := r.db.Model(&models.File{}).Where("sha256 = ?", sha256).Count(&count).Error
	return count, err
}

func (r *FileRepository) Update(file *models.File) error {
	return r.db.Save(file).Error
}

func (r *FileRepository) Delete(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.File{}).Error
}
