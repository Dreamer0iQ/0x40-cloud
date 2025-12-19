package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/repositories"

	"github.com/google/uuid"
)

type ShareService struct {
	repo        *repositories.SharedFileRepository
	fileRepo    *repositories.FileRepository
	fileService *FileService
}

func NewShareService(repo *repositories.SharedFileRepository, fileRepo *repositories.FileRepository, fileService *FileService) *ShareService {
	return &ShareService{repo: repo, fileRepo: fileRepo, fileService: fileService}
}

func (s *ShareService) CreateShare(userID uint, fileID uuid.UUID, limit *int, expiresAt *time.Time) (*models.SharedFile, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, err
	}
	fmt.Printf("DEBUG: CreateShare - Request UserID: %d, File UserID: %d, FileID: %s\n", userID, file.UserID, file.ID)

	if file.UserID != userID {
		return nil, errors.New("unauthorized")
	}

	token, err := generateToken(32)
	if err != nil {
		return nil, err
	}

	share := &models.SharedFile{
		Token:     token,
		FileID:    fileID,
		UserID:    userID,
		Limit:     limit,
		ExpiresAt: expiresAt,
	}

	if err := s.repo.Create(share); err != nil {
		return nil, err
	}

	return share, nil
}

func (s *ShareService) GetSharedFile(token string) (*models.SharedFile, error) {
	share, err := s.repo.GetByToken(token)
	if err != nil {
		return nil, errors.New("share not found")
	}

	// Check expiration
	if share.ExpiresAt != nil && time.Now().After(*share.ExpiresAt) {
		return nil, errors.New("link expired")
	}

	// Check download limit
	if share.Limit != nil && share.Downloads >= *share.Limit {
		return nil, errors.New("download limit reached")
	}

	return share, nil
}

func (s *ShareService) DownloadSharedFile(token string, dst io.Writer) (*models.SharedFile, error) {
	share, err := s.GetSharedFile(token)
	if err != nil {
		return nil, err
	}

	if err := s.repo.IncrementDownloads(token); err != nil {
		return nil, err
	}

	if err := s.fileService.decryptFile(share.File.Path, dst); err != nil {
		return nil, err
	}

	return share, nil
}

func (s *ShareService) TrackDownload(token string) error {
	return s.repo.IncrementDownloads(token)
}

func (s *ShareService) ListUserShares(userID uint) ([]models.SharedFile, error) {
	return s.repo.GetByUserID(userID)
}

func (s *ShareService) RevokeShare(userID uint, token string) error {
	share, err := s.repo.GetByToken(token)
	if err != nil {
		return err
	}

	if share.UserID != userID {
		return errors.New("unauthorized")
	}

	return s.repo.Delete(token)
}

func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
