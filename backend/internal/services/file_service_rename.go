package services

import (
	"fmt"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/google/uuid"
)

// RenameFile переименовывает файл (меняет только original_name)
func (s *FileService) RenameFile(fileID uuid.UUID, userID uint, newName string) (*models.File, error) {
	// Проверяем права доступа
	file, err := s.GetFile(fileID, userID)
	if err != nil {
		return nil, err
	}

	// Валидация имени файла
	if newName == "" {
		return nil, fmt.Errorf("new name cannot be empty")
	}

	// Обновляем только оригинальное имя
	file.OriginalName = newName

	// Сохраняем изменения
	if err := s.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to rename file: %w", err)
	}

	return file, nil
}
