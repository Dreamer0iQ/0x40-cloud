package repository

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/models"
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

func (r *FileRepository) FindByID(id uint) (*models.File, error) {
	var file models.File
	err := r.db.Preload("User").First(&file, id).Error
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

func (r *FileRepository) Update(file *models.File) error {
	return r.db.Save(file).Error
}

func (r *FileRepository) Delete(id uint) error {
	return r.db.Delete(&models.File{}, id).Error
}
