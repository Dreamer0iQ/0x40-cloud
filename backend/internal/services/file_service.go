package services

import (
	"archive/zip"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FileService struct {
	fileRepo          *repositories.FileRepository
	starredRepo       *repositories.StarredFileRepository
	starredFolderRepo *repositories.StarredFolderRepository
	storageDir        string
	encryptionKey     []byte // 32 bytes для AES-256
	storageLimit      int64
	maxUploadSize     int64
}

func NewFileService(fileRepo *repositories.FileRepository, starredRepo *repositories.StarredFileRepository, starredFolderRepo *repositories.StarredFolderRepository, storageDir string, encryptionKey string, storageLimit int64, maxUploadSize int64) (*FileService, error) {
	// Убеждаемся, что ключ имеет правильную длину (32 байта для AES-256)
	key := []byte(encryptionKey)
	if len(key) != 32 {
		return nil, fmt.Errorf("encryption key must be exactly 32 bytes, got %d", len(key))
	}

	// Создаем директорию для хранения, если её нет
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	return &FileService{
		fileRepo:          fileRepo,
		starredRepo:       starredRepo,
		starredFolderRepo: starredFolderRepo,
		storageDir:        storageDir,
		encryptionKey:     key,
		storageLimit:      storageLimit,
		maxUploadSize:     maxUploadSize,
	}, nil
}

func (s *FileService) calculateSHA256(file multipart.File) (string, error) {
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("failed to calculate hash: %w", err)
	}

	if _, err := file.Seek(0, 0); err != nil {
		return "", fmt.Errorf("failed to reset file cursor: %w", err)
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// getStoragePath возвращает путь для хранения файла на основе SHA256 хеша
// Первые 2 символа - папка, следующие 2 - подпапка
func (s *FileService) getStoragePath(sha256Hash string) string {
	if len(sha256Hash) < 4 {
		return filepath.Join(s.storageDir, "misc", sha256Hash)
	}

	dir1 := sha256Hash[0:2]
	dir2 := sha256Hash[2:4]

	return filepath.Join(s.storageDir, dir1, dir2, sha256Hash)
}

func (s *FileService) encryptFile(src multipart.File, dstPath string) (int64, error) {
	// Проверяем путь на безопасность
	safePath, err := s.sanitizePath(dstPath)
	if err != nil {
		return 0, fmt.Errorf("invalid destination path: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(safePath), 0750); err != nil {
		return 0, fmt.Errorf("failed to create directories: %w", err)
	}

	dstFile, err := os.Create(safePath)
	if err != nil {
		return 0, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer func() {
		if closeErr := dstFile.Close(); closeErr != nil {
			fmt.Printf("Warning: failed to close file: %v\n", closeErr)
		}
	}()

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return 0, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return 0, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return 0, fmt.Errorf("failed to generate nonce: %w", err)
	}

	if _, err := dstFile.Write(nonce); err != nil {
		return 0, fmt.Errorf("failed to write nonce: %w", err)
	}

	buf := make([]byte, 64*1024)
	var totalWritten int64 = int64(len(nonce))

	for {
		n, err := src.Read(buf)
		if err != nil && err != io.EOF {
			return 0, fmt.Errorf("failed to read source file: %w", err)
		}
		if n == 0 {
			break
		}

		encrypted := gcm.Seal(nil, nonce, buf[:n], nil)

		written, err := dstFile.Write(encrypted)
		if err != nil {
			return 0, fmt.Errorf("failed to write encrypted data: %w", err)
		}

		totalWritten += int64(written)

		for i := len(nonce) - 1; i >= 0; i-- {
			nonce[i]++
			if nonce[i] != 0 {
				break
			}
		}
	}

	return totalWritten, nil
}

func (s *FileService) decryptFile(srcPath string, dst io.Writer) error {
	safePath, err := s.sanitizePath(srcPath)
	if err != nil {
		return fmt.Errorf("invalid source path: %w", err)
	}

	srcFile, err := os.Open(safePath)
	if err != nil {
		return fmt.Errorf("failed to open encrypted file: %w", err)
	}
	defer func() {
		if closeErr := srcFile.Close(); closeErr != nil {
			fmt.Printf("Warning: failed to close file: %v\n", closeErr)
		}
	}()

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(srcFile, nonce); err != nil {
		return fmt.Errorf("failed to read nonce: %w", err)
	}

	buf := make([]byte, 64*1024+gcm.Overhead())

	for {
		n, err := srcFile.Read(buf)
		if err != nil && err != io.EOF {
			return fmt.Errorf("failed to read encrypted file: %w", err)
		}
		if n == 0 {
			break
		}

		decrypted, err := gcm.Open(nil, nonce, buf[:n], nil)
		if err != nil {
			return fmt.Errorf("failed to decrypt data: %w", err)
		}

		if _, err := dst.Write(decrypted); err != nil {
			return fmt.Errorf("failed to write decrypted data: %w", err)
		}

		for i := len(nonce) - 1; i >= 0; i-- {
			nonce[i]++
			if nonce[i] != 0 {
				break
			}
		}
	}

	return nil
}

func (s *FileService) UploadFile(userID uint, fileHeader *multipart.FileHeader) (*models.File, error) {
	return s.UploadFileWithPath(userID, fileHeader, "/", "")
}

func (s *FileService) CreateFolder(userID uint, virtualPath, folderName string) (*models.File, error) {
	if virtualPath == "" {
		virtualPath = "/"
	}
	if !strings.HasSuffix(virtualPath, "/") {
		virtualPath += "/"
	}

	existingFiles, err := s.fileRepo.FindByUserIDAndPath(userID, virtualPath)
	if err == nil {
		for _, f := range existingFiles {
			if f.OriginalName == folderName && f.MimeType == "inode/directory" {
				return nil, fmt.Errorf("folder already exists")
			}
		}
	}

	emptyHash := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	storagePath := s.getStoragePath(emptyHash)

	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		if err := os.MkdirAll(filepath.Dir(storagePath), 0750); err != nil {
			return nil, fmt.Errorf("failed to create directories: %w", err)
		}
		f, err := os.Create(storagePath)
		if err != nil {
			return nil, fmt.Errorf("failed to create marker file: %w", err)
		}
		if closeErr := f.Close(); closeErr != nil {
			return nil, fmt.Errorf("failed to close marker file: %w", closeErr)
		}
	}

	fileID := uuid.New()
	fileModel := &models.File{
		ID:            fileID,
		UserID:        userID,
		Filename:      uuid.New().String(),
		OriginalName:  folderName,
		Path:          storagePath,
		VirtualPath:   virtualPath,
		FolderName:    "", // Это сама папка, она не часть другой "загружаемой папки" в контексте UploadFolder
		SHA256:        emptyHash,
		MimeType:      "inode/directory",
		Size:          0,
		EncryptedSize: 0,
	}

	if err := s.fileRepo.Create(fileModel); err != nil {
		return nil, fmt.Errorf("failed to create folder record: %w", err)
	}

	return fileModel, nil
}

func (s *FileService) UploadFileWithPath(userID uint, fileHeader *multipart.FileHeader, virtualPath, folderName string) (*models.File, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	if fileHeader.Size > s.maxUploadSize {
		return nil, fmt.Errorf("file too large: max size is %d bytes", s.maxUploadSize)
	}

	stats, err := s.GetStorageStats(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check storage quota: %w", err)
	}

	if stats.TotalUsed+fileHeader.Size > s.storageLimit {
		return nil, fmt.Errorf("storage quota exceeded")
	}

	sha256Hash, err := s.calculateSHA256(file)
	if err != nil {
		return nil, err
	}

	existingFile, err := s.fileRepo.FindBySHA256AndUserID(sha256Hash, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing file: %w", err)
	}
	if err == nil && existingFile != nil {
		return existingFile, nil
	}

	storagePath := s.getStoragePath(sha256Hash)

	var encryptedSize int64
	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		encryptedSize, err = s.encryptFile(file, storagePath)
		if err != nil {
			return nil, err
		}
	} else {
		fileInfo, err := os.Stat(storagePath)
		if err != nil {
			return nil, fmt.Errorf("failed to get file info: %w", err)
		}
		encryptedSize = fileInfo.Size()
	}

	if virtualPath == "" {
		virtualPath = "/"
	}
	if virtualPath[len(virtualPath)-1] != '/' {
		virtualPath += "/"
	}

	fileModel := &models.File{
		ID:            uuid.New(),
		UserID:        userID,
		Filename:      uuid.New().String() + filepath.Ext(fileHeader.Filename),
		OriginalName:  fileHeader.Filename,
		Path:          storagePath,
		VirtualPath:   virtualPath,
		FolderName:    folderName,
		SHA256:        sha256Hash,
		MimeType:      fileHeader.Header.Get("Content-Type"),
		Size:          fileHeader.Size,
		EncryptedSize: encryptedSize,
	}

	if err := s.fileRepo.Create(fileModel); err != nil {
		return nil, fmt.Errorf("failed to save file metadata: %w", err)
	}

	return fileModel, nil
}

func (s *FileService) GetFile(fileID uuid.UUID, userID uint) (*models.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}

	if file.UserID != userID {
		return nil, fmt.Errorf("access denied")
	}

	return file, nil
}

func (s *FileService) DownloadFile(fileID uuid.UUID, userID uint, dst io.Writer) (*models.File, error) {
	file, err := s.GetFile(fileID, userID)
	if err != nil {
		return nil, err
	}

	if err := s.decryptFile(file.Path, dst); err != nil {
		return nil, fmt.Errorf("failed to decrypt file: %w", err)
	}

	return file, nil
}

func (s *FileService) GetUserFiles(userID uint) ([]models.File, error) {
	files, err := s.fileRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

func (s *FileService) GetRecentFiles(userID uint, limit int) ([]models.File, error) {
	files, err := s.fileRepo.FindRecentByUserID(userID, limit)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

func (s *FileService) GetFilesByPath(userID uint, virtualPath string) ([]models.File, error) {
	files, err := s.fileRepo.FindByUserIDAndPath(userID, virtualPath)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

func (s *FileService) SearchFiles(userID uint, query string, limit int) ([]models.File, error) {
	if query == "" {
		return []models.File{}, nil
	}
	files, err := s.fileRepo.SearchByName(userID, query, limit)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

func (s *FileService) GetImages(userID uint, limit int) ([]models.File, error) {
	// Список MIME-типов изображений
	imageMimeTypes := map[string]bool{
		"image/jpeg":    true,
		"image/jpg":     true,
		"image/png":     true,
		"image/gif":     true,
		"image/webp":    true,
		"image/bmp":     true,
		"image/svg+xml": true,
		"image/heic":    true,
		"image/heif":    true,
	}

	allFiles, err := s.fileRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	images := make([]models.File, 0)
	for _, file := range allFiles {
		if imageMimeTypes[file.MimeType] {
			images = append(images, file)
			if limit > 0 && len(images) >= limit {
				break
			}
		}
	}

	return s.EnrichFilesWithStarred(images, userID)
}

func (s *FileService) DownloadFolderAsZip(virtualPath string, userID uint, w io.Writer) error {
	if virtualPath == "" {
		virtualPath = "/"
	}
	if !strings.HasSuffix(virtualPath, "/") {
		virtualPath += "/"
	}

	files, err := s.fileRepo.FindByUserIDAndPath(userID, virtualPath)
	if err != nil {
		return fmt.Errorf("failed to get files: %w", err)
	}

	zipWriter := zip.NewWriter(w)
	defer func() {
		if closeErr := zipWriter.Close(); closeErr != nil {
			fmt.Printf("Warning: failed to close zip writer: %v\n", closeErr)
		}
	}()

	for _, file := range files {
		if file.MimeType == "inode/directory" {
			continue
		}

		zipFile, err := zipWriter.Create(file.OriginalName)
		if err != nil {
			return fmt.Errorf("failed to create zip entry: %w", err)
		}

		if err := s.decryptFile(file.Path, zipFile); err != nil {
			return fmt.Errorf("failed to decrypt file %s: %w", file.OriginalName, err)
		}
	}

	return nil
}

func (s *FileService) DeleteFile(fileID uuid.UUID, userID uint) error {
	_, err := s.GetFile(fileID, userID)
	if err != nil {
		return err
	}

	if err := s.fileRepo.Delete(fileID); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	return nil
}

func (s *FileService) DeleteFolder(virtualPath string, userID uint) error {
	if virtualPath == "" {
		return fmt.Errorf("cannot delete root folder")
	}
	if !strings.HasSuffix(virtualPath, "/") {
		virtualPath += "/"
	}

	files, err := s.fileRepo.FindByUserIDAndPath(userID, virtualPath)
	if err != nil {
		return fmt.Errorf("failed to get files: %w", err)
	}

	for _, file := range files {
		if err := s.DeleteFile(file.ID, userID); err != nil {
			return fmt.Errorf("failed to delete file %s: %w", file.OriginalName, err)
		}
	}

	folderMarkers, err := s.fileRepo.FindByUserIDAndPath(userID, filepath.Dir(virtualPath)+"/")
	if err == nil {
		folderName := filepath.Base(strings.TrimSuffix(virtualPath, "/"))
		for _, folder := range folderMarkers {
			if folder.OriginalName == folderName && folder.MimeType == "inode/directory" {
				if err := s.DeleteFile(folder.ID, userID); err != nil {
					return fmt.Errorf("failed to delete folder marker: %w", err)
				}
				break
			}
		}
	}

	return nil
}

func (s *FileService) GetDeletedFiles(userID uint) ([]models.File, error) {
	files, err := s.fileRepo.FindDeletedByUserID(userID)
	if err != nil {
		return nil, err
	}

	return files, nil
}

func (s *FileService) RestoreFile(fileID uuid.UUID, userID uint) error {
	file, err := s.fileRepo.FindByIDUnscoped(fileID)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}

	if file.UserID != userID {
		return fmt.Errorf("access denied")
	}

	if err := s.fileRepo.Restore(fileID); err != nil {
		return fmt.Errorf("failed to restore file: %w", err)
	}

	return nil
}

func (s *FileService) DeleteFilePermanently(fileID uuid.UUID, userID uint) error {
	file, err := s.fileRepo.FindByIDUnscoped(fileID)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}

	if file.UserID != userID {
		return fmt.Errorf("access denied")
	}

	count, err := s.fileRepo.CountBySHA256Unscoped(file.SHA256)
	if err != nil {
		return fmt.Errorf("failed to check file usage: %w", err)
	}

	if err := s.fileRepo.DeletePermanently(fileID); err != nil {
		return fmt.Errorf("failed to delete file permanently: %w", err)
	}

	if count <= 1 {
		if err := os.Remove(file.Path); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: failed to delete physical file %s: %v\n", file.Path, err)
		}
	}

	return nil
}

func (s *FileService) getFileSystemUsage() (total, free uint64, err error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(s.storageDir, &stat); err != nil {
		return 0, 0, err
	}

	free = uint64(stat.Bavail) * uint64(stat.Bsize)
	total = uint64(stat.Blocks) * uint64(stat.Bsize)
	return total, free, nil
}

func (s *FileService) GetStorageStats(userID uint) (*models.StorageStats, error) {
	stats, err := s.fileRepo.GetStorageStats(userID)
	if err != nil {
		return nil, err
	}

	stats.Limit = s.storageLimit

	total, free, err := s.getFileSystemUsage()
	if err != nil {
		fmt.Printf("Warning: failed to get disk usage: %v\n", err)
	} else {
		const maxInt64 = int64(^uint64(0) >> 1)

		if total > uint64(maxInt64) {
			stats.PhysicalTotal = maxInt64
		} else {
			stats.PhysicalTotal = int64(total)
		}

		if free > uint64(maxInt64) {
			stats.PhysicalFree = maxInt64
		} else {
			stats.PhysicalFree = int64(free)
		}
	}

	return stats, nil
}

func (s *FileService) sanitizePath(path string) (string, error) {
	cleanPath := filepath.Clean(path)

	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve absolute path: %w", err)
	}

	absStorageDir, err := filepath.Abs(s.storageDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve storage directory: %w", err)
	}

	if !strings.HasPrefix(absPath, absStorageDir) {
		return "", errors.New("path traversal attempt detected")
	}

	return absPath, nil
}
