package services

import (
	"fmt"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/google/uuid"
)

// MoveFile перемещает файл в другую папку (меняет virtual_path)
func (s *FileService) MoveFile(fileID uuid.UUID, userID uint, newPath string) (*models.File, error) {
	// Проверяем права доступа
	file, err := s.GetFile(fileID, userID)
	if err != nil {
		return nil, err
	}

	// Нормализуем путь
	if newPath == "" {
		newPath = "/"
	}
	if len(newPath) > 0 && newPath[len(newPath)-1] != '/' {
		newPath += "/"
	}

	// Update path
	file.VirtualPath = newPath

	// Сохраняем изменения
	if err := s.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to move file: %w", err)
	}

	return file, nil
}
