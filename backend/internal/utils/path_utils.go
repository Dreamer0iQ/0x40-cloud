package utils

import (
	"errors"
	"path"
	"strings"
)

var (
	ErrInvalidPath = errors.New("invalid or dangerous path")
)

func SanitizePath(inputPath string) (string, error) {
	if inputPath == "" {
		return "/", nil
	}

	cleaned := path.Clean("/" + inputPath)

	if strings.Contains(cleaned, "..") {
		return "", ErrInvalidPath
	}

	if !strings.HasPrefix(cleaned, "/") {
		return "", ErrInvalidPath
	}

	if strings.ContainsAny(cleaned, "<>:\"|?*") {
		return "", ErrInvalidPath
	}

	return cleaned, nil
}

func ValidatePath(inputPath string) bool {
	_, err := SanitizePath(inputPath)
	return err == nil
}

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
