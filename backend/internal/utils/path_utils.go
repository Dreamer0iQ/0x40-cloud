package utils

import (
	"errors"
	"path"
	"strings"
)

var (
	ErrInvalidPath = errors.New("invalid or dangerous path")
)

// SanitizePath очищает и нормализует путь, защищает от path traversal
func SanitizePath(inputPath string) (string, error) {
	// Пустой путь = корень
	if inputPath == "" {
		return "/", nil
	}

	// Очистка пути
	cleaned := path.Clean("/" + inputPath)

	// Проверка на path traversal
	if strings.Contains(cleaned, "..") {
		return "", ErrInvalidPath
	}

	// Проверка, что путь начинается с /
	if !strings.HasPrefix(cleaned, "/") {
		return "", ErrInvalidPath
	}

	// Не разрешаем специальные символы
	if strings.ContainsAny(cleaned, "<>:\"|?*") {
		return "", ErrInvalidPath
	}

	return cleaned, nil
}

// ValidatePath проверяет, что путь безопасен для использования
func ValidatePath(inputPath string) bool {
	_, err := SanitizePath(inputPath)
	return err == nil
}

// JoinPaths безопасно объединяет пути
func JoinPaths(base, relative string) (string, error) {
	cleanBase, err := SanitizePath(base)
	if err != nil {
		return "", err
	}

	cleanRelative, err := SanitizePath(relative)
	if err != nil {
		return "", err
	}

	joined := path.Join(cleanBase, cleanRelative)
	return SanitizePath(joined)
}
