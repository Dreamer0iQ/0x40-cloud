package repositories

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/models"

	"gorm.io/gorm"
)

type SharedFileRepository struct {
	db *gorm.DB
}

func NewSharedFileRepository(db *gorm.DB) *SharedFileRepository {
	return &SharedFileRepository{db: db}
}

func (r *SharedFileRepository) Create(share *models.SharedFile) error {
	return r.db.Create(share).Error
}

func (r *SharedFileRepository) GetByToken(token string) (*models.SharedFile, error) {
	var share models.SharedFile
	if err := r.db.Preload("File").Preload("User").Where("token = ?", token).First(&share).Error; err != nil {
		return nil, err
	}
	return &share, nil
}

func (r *SharedFileRepository) GetByUserID(userID uint) ([]models.SharedFile, error) {
	var shares []models.SharedFile
	if err := r.db.Preload("File").Where("user_id = ?", userID).Order("created_at desc").Find(&shares).Error; err != nil {
		return nil, err
	}
	return shares, nil
}

func (r *SharedFileRepository) Delete(token string) error {
	return r.db.Where("token = ?", token).Delete(&models.SharedFile{}).Error
}

func (r *SharedFileRepository) IncrementDownloads(token string) error {
	return r.db.Model(&models.SharedFile{}).Where("token = ?", token).UpdateColumn("downloads", gorm.Expr("downloads + ?", 1)).Error
}
