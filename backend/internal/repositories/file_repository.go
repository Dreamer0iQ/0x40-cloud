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

func (r *FileRepository) FindByIDUnscoped(id uuid.UUID) (*models.File, error) {
	var file models.File
	err := r.db.Unscoped().Preload("User").Where("id = ?", id).First(&file).Error
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

func (r *FileRepository) FindByUserIDAndPath(userID uint, virtualPath string) ([]models.File, error) {
	var files []models.File

	// Нормализуем путь - он должен заканчиваться на /
	if virtualPath != "/" && len(virtualPath) > 0 && virtualPath[len(virtualPath)-1] != '/' {
		virtualPath += "/"
	}

	// Получаем файлы в текущем пути
	err := r.db.Where("user_id = ? AND virtual_path = ?", userID, virtualPath).
		Order("folder_name ASC, original_name ASC").
		Find(&files).Error

	if err != nil {
		return nil, err
	}

	// Получаем уникальные папки первого уровня вложенности
	// Ищем все пути, которые начинаются с текущего пути, но не равны ему
	var subPaths []struct {
		VirtualPath string
	}

	// Паттерн для поиска: если путь = "/", ищем "/%" но не "/",
	// если путь = "/ctf/", ищем "/ctf/%" но не "/ctf/"
	searchPattern := virtualPath + "%"

	err = r.db.Model(&models.File{}).
		Select("DISTINCT virtual_path").
		Where("user_id = ? AND virtual_path LIKE ? AND virtual_path != ?", userID, searchPattern, virtualPath).
		Find(&subPaths).Error

	if err != nil {
		return files, nil // Возвращаем хотя бы файлы, если не удалось получить папки
	}

	// Извлекаем уникальные папки первого уровня
	folderMap := make(map[string]bool)
	pathLen := len(virtualPath)

	for _, sp := range subPaths {
		// Извлекаем первую папку после текущего пути
		subPath := sp.VirtualPath[pathLen:] // Убираем префикс текущего пути

		// Находим первый слэш (это граница папки первого уровня)
		slashIdx := 0
		for i, c := range subPath {
			if c == '/' {
				slashIdx = i
				break
			}
		}

		if slashIdx > 0 {
			folderName := subPath[:slashIdx]
			folderMap[folderName] = true
		}
	}

	// Добавляем "виртуальные" записи для папок
	for folderName := range folderMap {
		// Создаем виртуальную запись для папки
		folderFile := models.File{
			OriginalName: folderName,
			VirtualPath:  virtualPath,
			FolderName:   folderName,
			MimeType:     "inode/directory", // Специальный MIME-тип для папок
		}
		files = append(files, folderFile)
	}

	return files, nil
}

func (r *FileRepository) FindDeletedByUserID(userID uint) ([]models.File, error) {
	var files []models.File
	err := r.db.Unscoped().Where("user_id = ? AND deleted_at IS NOT NULL", userID).Order("deleted_at DESC").Find(&files).Error
	return files, err
}

func (r *FileRepository) Restore(id uuid.UUID) error {
	return r.db.Unscoped().Model(&models.File{}).Where("id = ?", id).Update("deleted_at", nil).Error
}

func (r *FileRepository) DeletePermanently(id uuid.UUID) error {
	return r.db.Unscoped().Where("id = ?", id).Delete(&models.File{}).Error
}

func (r *FileRepository) CountBySHA256Unscoped(sha256 string) (int64, error) {
	var count int64
	err := r.db.Unscoped().Model(&models.File{}).Where("sha256 = ?", sha256).Count(&count).Error
	return count, err
}

func (r *FileRepository) FindImagesByUserID(userID uint, limit int) ([]models.File, error) {
	var files []models.File
	// MIME types for images: image/jpeg, image/png, image/gif, etc.
	err := r.db.Where("user_id = ? AND mime_type LIKE ?", userID, "image/%").
		Order("created_at DESC").
		Limit(limit).
		Find(&files).Error
	return files, err
}

func (r *FileRepository) FindAllRecursively(userID uint, virtualPathPrefix string) ([]models.File, error) {
	var files []models.File

	// Ensure prefix ends with / if not root
	if virtualPathPrefix != "/" && len(virtualPathPrefix) > 0 && virtualPathPrefix[len(virtualPathPrefix)-1] != '/' {
		virtualPathPrefix += "/"
	}

	searchPattern := virtualPathPrefix + "%"

	err := r.db.Where("user_id = ? AND virtual_path LIKE ?", userID, searchPattern).
		Find(&files).Error
	
	if err != nil {
		return nil, err
	}
	return files, nil
}
