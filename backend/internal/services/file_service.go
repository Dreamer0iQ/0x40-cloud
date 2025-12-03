package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/repositories"
	"github.com/google/uuid"
)

type FileService struct {
	fileRepo      *repositories.FileRepository
	starredRepo   *repositories.StarredFileRepository
	storageDir    string
	encryptionKey []byte // 32 bytes для AES-256
}

func NewFileService(fileRepo *repositories.FileRepository, starredRepo *repositories.StarredFileRepository, storageDir string, encryptionKey string) (*FileService, error) {
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
		fileRepo:      fileRepo,
		starredRepo:   starredRepo,
		storageDir:    storageDir,
		encryptionKey: key,
	}, nil
}

// calculateSHA256 вычисляет SHA256 хеш файла
func (s *FileService) calculateSHA256(file multipart.File) (string, error) {
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("failed to calculate hash: %w", err)
	}

	// Возвращаем курсор файла в начало
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

// encryptFile шифрует содержимое файла используя AES-256-GCM
func (s *FileService) encryptFile(src multipart.File, dstPath string) (int64, error) {
	// Создаем директории если их нет
	if err := os.MkdirAll(filepath.Dir(dstPath), 0755); err != nil {
		return 0, fmt.Errorf("failed to create directories: %w", err)
	}

	// Создаем файл для записи зашифрованных данных
	dstFile, err := os.Create(dstPath)
	if err != nil {
		return 0, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dstFile.Close()

	// Создаем AES cipher
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return 0, fmt.Errorf("failed to create cipher: %w", err)
	}

	// Создаем GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return 0, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Генерируем nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return 0, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Записываем nonce в начало файла
	if _, err := dstFile.Write(nonce); err != nil {
		return 0, fmt.Errorf("failed to write nonce: %w", err)
	}

	// Читаем и шифруем файл по частям
	buf := make([]byte, 64*1024) // 64KB буфер
	var totalWritten int64 = int64(len(nonce))

	for {
		n, err := src.Read(buf)
		if err != nil && err != io.EOF {
			return 0, fmt.Errorf("failed to read source file: %w", err)
		}
		if n == 0 {
			break
		}

		// Шифруем данные
		encrypted := gcm.Seal(nil, nonce, buf[:n], nil)

		// Записываем зашифрованные данные
		written, err := dstFile.Write(encrypted)
		if err != nil {
			return 0, fmt.Errorf("failed to write encrypted data: %w", err)
		}

		totalWritten += int64(written)

		// Обновляем nonce для следующего блока (increment)
		for i := len(nonce) - 1; i >= 0; i-- {
			nonce[i]++
			if nonce[i] != 0 {
				break
			}
		}
	}

	return totalWritten, nil
}

// decryptFile расшифровывает файл
func (s *FileService) decryptFile(srcPath string, dst io.Writer) error {
	// Открываем зашифрованный файл
	srcFile, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("failed to open encrypted file: %w", err)
	}
	defer srcFile.Close()

	// Создаем AES cipher
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return fmt.Errorf("failed to create cipher: %w", err)
	}

	// Создаем GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return fmt.Errorf("failed to create GCM: %w", err)
	}

	// Читаем nonce из начала файла
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(srcFile, nonce); err != nil {
		return fmt.Errorf("failed to read nonce: %w", err)
	}

	// Читаем и расшифровываем файл по частям
	buf := make([]byte, 64*1024+gcm.Overhead()) // 64KB + overhead буфер

	for {
		n, err := srcFile.Read(buf)
		if err != nil && err != io.EOF {
			return fmt.Errorf("failed to read encrypted file: %w", err)
		}
		if n == 0 {
			break
		}

		// Расшифровываем данные
		decrypted, err := gcm.Open(nil, nonce, buf[:n], nil)
		if err != nil {
			return fmt.Errorf("failed to decrypt data: %w", err)
		}

		// Записываем расшифрованные данные
		if _, err := dst.Write(decrypted); err != nil {
			return fmt.Errorf("failed to write decrypted data: %w", err)
		}

		// Обновляем nonce для следующего блока
		for i := len(nonce) - 1; i >= 0; i-- {
			nonce[i]++
			if nonce[i] != 0 {
				break
			}
		}
	}

	return nil
}

// UploadFile загружает и шифрует файл
func (s *FileService) UploadFile(userID uint, fileHeader *multipart.FileHeader) (*models.File, error) {
	return s.UploadFileWithPath(userID, fileHeader, "/", "")
}

// UploadFileWithPath загружает и шифрует файл с указанием виртуального пути
func (s *FileService) UploadFileWithPath(userID uint, fileHeader *multipart.FileHeader, virtualPath, folderName string) (*models.File, error) {
	// Открываем файл
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Вычисляем SHA256 хеш
	sha256Hash, err := s.calculateSHA256(file)
	if err != nil {
		return nil, err
	}

	// Проверяем, существует ли уже файл с таким хешем для этого пользователя
	existingFile, err := s.fileRepo.FindBySHA256AndUserID(sha256Hash, userID)
	if err == nil && existingFile != nil {
		// Файл уже существует, возвращаем его
		return existingFile, nil
	}

	// Определяем путь для хранения
	storagePath := s.getStoragePath(sha256Hash)

	// Шифруем и сохраняем файл (если файл с таким хешем еще не существует на диске)
	var encryptedSize int64
	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		encryptedSize, err = s.encryptFile(file, storagePath)
		if err != nil {
			return nil, err
		}
	} else {
		// Файл уже существует на диске, получаем его размер
		fileInfo, err := os.Stat(storagePath)
		if err != nil {
			return nil, fmt.Errorf("failed to get file info: %w", err)
		}
		encryptedSize = fileInfo.Size()
	}

	// Нормализуем виртуальный путь
	if virtualPath == "" {
		virtualPath = "/"
	}
	if virtualPath[len(virtualPath)-1] != '/' {
		virtualPath += "/"
	}

	// Создаем запись в БД
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

// GetFile получает файл по ID
func (s *FileService) GetFile(fileID uuid.UUID, userID uint) (*models.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}

	// Проверяем, что файл принадлежит пользователю
	if file.UserID != userID {
		return nil, fmt.Errorf("access denied")
	}

	return file, nil
}

// DownloadFile расшифровывает и отдает файл
func (s *FileService) DownloadFile(fileID uuid.UUID, userID uint, dst io.Writer) (*models.File, error) {
	file, err := s.GetFile(fileID, userID)
	if err != nil {
		return nil, err
	}

	// Расшифровываем файл
	if err := s.decryptFile(file.Path, dst); err != nil {
		return nil, fmt.Errorf("failed to decrypt file: %w", err)
	}

	return file, nil
}

// GetUserFiles получает список файлов пользователя
func (s *FileService) GetUserFiles(userID uint) ([]models.File, error) {
	files, err := s.fileRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

// GetRecentFiles получает недавние файлы пользователя
func (s *FileService) GetRecentFiles(userID uint, limit int) ([]models.File, error) {
	files, err := s.fileRepo.FindRecentByUserID(userID, limit)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

// GetFilesByPath получает файлы и папки по виртуальному пути
func (s *FileService) GetFilesByPath(userID uint, virtualPath string) ([]models.File, error) {
	files, err := s.fileRepo.FindByUserIDAndPath(userID, virtualPath)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

// DeleteFile удаляет файл
func (s *FileService) DeleteFile(fileID uuid.UUID, userID uint) error {
	file, err := s.GetFile(fileID, userID)
	if err != nil {
		return err
	}

	// Проверяем, используется ли этот файл другими пользователями
	count, err := s.fileRepo.CountBySHA256(file.SHA256)
	if err != nil {
		return fmt.Errorf("failed to check file usage: %w", err)
	}

	// Удаляем запись из БД
	if err := s.fileRepo.Delete(fileID); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	// Если это был последний пользователь с таким файлом, удаляем физический файл
	if count <= 1 {
		if err := os.Remove(file.Path); err != nil && !os.IsNotExist(err) {
			// Логируем ошибку, но не возвращаем её, т.к. запись в БД уже удалена
			fmt.Printf("Warning: failed to delete physical file %s: %v\n", file.Path, err)
		}
	}

	return nil
}

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

// ToggleStarred добавляет или удаляет файл из избранного
func (s *FileService) ToggleStarred(fileID uuid.UUID, userID uint) (bool, error) {
	// Проверяем, что файл существует и принадлежит пользователю
	_, err := s.GetFile(fileID, userID)
	if err != nil {
		return false, err
	}

	// Проверяем текущий статус
	isStarred, err := s.starredRepo.IsStarred(userID, fileID)
	if err != nil {
		return false, fmt.Errorf("failed to check starred status: %w", err)
	}

	if isStarred {
		// Убираем из избранного
		if err := s.starredRepo.Delete(userID, fileID); err != nil {
			return false, fmt.Errorf("failed to unstar file: %w", err)
		}
		return false, nil
	} else {
		// Добавляем в избранное
		starredFile := &models.StarredFile{
			UserID: userID,
			FileID: fileID,
		}
		if err := s.starredRepo.Create(starredFile); err != nil {
			return false, fmt.Errorf("failed to star file: %w", err)
		}
		return true, nil
	}
}

// GetStarredFiles получает все избранные файлы пользователя
func (s *FileService) GetStarredFiles(userID uint) ([]models.File, error) {
	files, err := s.starredRepo.FindStarredFilesByUserID(userID)
	if err != nil {
		return nil, err
	}
	
	// Обогащаем файлы информацией о starred
	// Для starred файлов устанавливаем IsStarred в true
	for i := range files {
		files[i].IsStarred = true
	}
	
	return files, nil
}

// EnrichFilesWithStarred добавляет информацию о starred к списку файлов
func (s *FileService) EnrichFilesWithStarred(files []models.File, userID uint) ([]models.File, error) {
	if len(files) == 0 {
		return files, nil
	}

	// Собираем ID файлов
	fileIDs := make([]uuid.UUID, 0, len(files))
	for _, file := range files {
		// Пропускаем виртуальные папки
		if file.MimeType == "inode/directory" {
			continue
		}
		fileIDs = append(fileIDs, file.ID)
	}

	if len(fileIDs) == 0 {
		return files, nil
	}

	// Получаем карту starred файлов
	starredMap, err := s.starredRepo.GetStarredMap(userID, fileIDs)
	if err != nil {
		return files, fmt.Errorf("failed to get starred map: %w", err)
	}

	// Обогащаем файлы информацией о starred
	for i := range files {
		files[i].IsStarred = starredMap[files[i].ID]
	}

	return files, nil
}
