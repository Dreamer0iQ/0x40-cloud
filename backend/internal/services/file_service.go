package services

import (
	"archive/zip"
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
	"strings"
	"syscall"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/repositories"
	"github.com/google/uuid"
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

// CreateFolder создает новую папку (как файл-маркер)
func (s *FileService) CreateFolder(userID uint, virtualPath, folderName string) (*models.File, error) {
	// Нормализуем пути
	if virtualPath == "" {
		virtualPath = "/"
	}
	if !strings.HasSuffix(virtualPath, "/") {
		virtualPath += "/"
	}

	// Проверяем, существует ли уже такая папка
	// Мы ищем файл с таким именем и mime_type = inode/directory в данной директории
	// В текущей реализации FindByUserIDAndPath возвращает все файлы в директории.
	// Оптимизация: можно добавить метод для проверки конкретного имени, но пока так:
	existingFiles, err := s.fileRepo.FindByUserIDAndPath(userID, virtualPath)
	if err == nil {
		for _, f := range existingFiles {
			if f.OriginalName == folderName && f.MimeType == "inode/directory" {
				return nil, fmt.Errorf("folder already exists")
			}
		}
	}

	// Создаем пустой файл-маркер на диске
	// Используем хеш пустой строки
	emptyHash := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	storagePath := s.getStoragePath(emptyHash)

	// Если файл еще не создан (никто не создавал пустых папок/файлов), создаем его
	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		if err := os.MkdirAll(filepath.Dir(storagePath), 0755); err != nil {
			return nil, fmt.Errorf("failed to create directories: %w", err)
		}
		f, err := os.Create(storagePath)
		if err != nil {
			return nil, fmt.Errorf("failed to create marker file: %w", err)
		}
		f.Close()
	}

	fileID := uuid.New()
	fileModel := &models.File{
		ID:            fileID,
		UserID:        userID,
		Filename:      uuid.New().String(), // Генерируем случайное имя, хотя физического файла уникального нет
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

	return fileModel, nil}

// UploadFileWithPath загружает и шифрует файл с указанием виртуального пути
func (s *FileService) UploadFileWithPath(userID uint, fileHeader *multipart.FileHeader, virtualPath, folderName string) (*models.File, error) {
	// Открываем файл
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
	
	if stats.Used + fileHeader.Size > s.storageLimit {
		return nil, fmt.Errorf("storage quota exceeded")
	}

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
	_, err := s.GetFile(fileID, userID)
	if err != nil {
		return err
	}

	// Удаляем запись из БД (soft delete)
	if err := s.fileRepo.Delete(fileID); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	return nil
}

// GetDeletedFiles получает список удаленных файлов пользователя
func (s *FileService) GetDeletedFiles(userID uint) ([]models.File, error) {
	files, err := s.fileRepo.FindDeletedByUserID(userID)
	if err != nil {
		return nil, err
	}
	// Мы не обогащаем удаленные файлы информацией о starred, так как они удалены
	return files, nil
}

// RestoreFile восстанавливает удаленный файл
func (s *FileService) RestoreFile(fileID uuid.UUID, userID uint) error {
	// Проверяем, что файл существует (даже если удален) и принадлежит пользователю
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

// DeleteFilePermanently удаляет файл навсегда
func (s *FileService) DeleteFilePermanently(fileID uuid.UUID, userID uint) error {
	file, err := s.fileRepo.FindByIDUnscoped(fileID)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}

	if file.UserID != userID {
		return fmt.Errorf("access denied")
	}

	// Проверяем, используется ли этот файл другими пользователями (включая удаленных)
	count, err := s.fileRepo.CountBySHA256Unscoped(file.SHA256)
	if err != nil {
		return fmt.Errorf("failed to check file usage: %w", err)
	}

	// Удаляем запись из БД навсегда
	if err := s.fileRepo.DeletePermanently(fileID); err != nil {
		return fmt.Errorf("failed to delete file permanently: %w", err)
	}

	// Если это был последний пользователь с таким файлом, удаляем физический файл
	if count <= 1 {
		if err := os.Remove(file.Path); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: failed to delete physical file %s: %v\n", file.Path, err)
		}
	}

	return nil
}



// GetImages получает последние изображения пользователя
func (s *FileService) GetImages(userID uint, limit int) ([]models.File, error) {
	files, err := s.fileRepo.FindImagesByUserID(userID, limit)
	if err != nil {
		return nil, err
	}
	return s.EnrichFilesWithStarred(files, userID)
}

// DownloadFolderAsZip скачивает папку как ZIP архив
func (s *FileService) DownloadFolderAsZip(virtualPath string, userID uint, dst io.Writer) error {
	// Находим все файлы в папке рекурсивно
	files, err := s.fileRepo.FindAllRecursively(userID, virtualPath)
	if err != nil {
		return fmt.Errorf("failed to find files: %w", err)
	}

	if len(files) == 0 {
		return fmt.Errorf("no files found in this folder")
	}

	// Создаем zip writer
	zipWriter := zip.NewWriter(dst)
	defer zipWriter.Close()

	// Ensure prefix ends with /
	prefix := virtualPath
	if prefix != "/" && len(prefix) > 0 && prefix[len(prefix)-1] != '/' {
		prefix += "/"
	}

	for _, file := range files {
		// Пропускаем виртуальные папки (если они вдруг попадут в выборку)
		if file.MimeType == "inode/directory" {
			continue
		}

		// Вычисляем относительный путь в архиве
		// Например: virtualPath="/foo/", file="/foo/bar/baz.txt" -> "bar/baz.txt"
		relPath := ""
		if strings.HasPrefix(file.VirtualPath, prefix) {
			relPath = file.VirtualPath[len(prefix):]
		}
		
		zipPath := filepath.Join(relPath, file.OriginalName)

		// Создаем entry в архиве
		w, err := zipWriter.Create(zipPath)
		if err != nil {
			return fmt.Errorf("failed to create zip entry for %s: %w", zipPath, err)
		}

		// Расшифровываем файл прямо в zip writer
		if err := s.decryptFile(file.Path, w); err != nil {
			// Логируем ошибку, но продолжаем? Или прерываем?
			// Лучше прервать, чтобы пользователь узнал об ошибке
			return fmt.Errorf("failed to decrypt file %s: %w", file.OriginalName, err)
		}
	}

	return nil
}

// DeleteFolder удаляет папку и все её содержимое
func (s *FileService) DeleteFolder(virtualPath string, userID uint) error {
	// Находим все файлы в папке рекурсивно
	files, err := s.fileRepo.FindAllRecursively(userID, virtualPath)
	if err != nil {
		return fmt.Errorf("failed to find files: %w", err)
	}

	// Удаляем каждый файл (soft delete)
	for _, file := range files {
		// Если это виртуальная папка (inode/directory), удаляем её тоже через репозиторий файлов
		// Метод Delete в репозитории должен работать по ID
		// Если у папки есть ID (она есть в БД), удаляем по ID.
		// Если это просто сгруппированные файлы, то они удалятся, когда мы удалим все файлы.
		
		// В текущей реализации папки могут быть как отдельные записи (inode/directory), так и просто виртуальные.
		// FindAllRecursively должен возвращать и те и другие, если они есть в БД.
		
		if err := s.fileRepo.Delete(file.ID); err != nil {
			// Логируем ошибку, но продолжаем удаление других файлов?
			// Или прерываем? Для консистентности лучше попробовать удалить всё что можно.
			fmt.Printf("Failed to delete file %s during folder deletion: %v\n", file.ID, err)
		}
	}
	
	// Если папка была в starred, удаляем её оттуда
	// Убедимся, что путь заканчивается на /
	folderPath := virtualPath
	if len(folderPath) > 0 && folderPath[len(folderPath)-1] != '/' {
		folderPath += "/"
	}
	
	if err := s.starredFolderRepo.Delete(userID, folderPath); err != nil {
		// Игнорируем ошибку, если папки не было в избранном
		_ = err
	}

	return nil
}

// getFileSystemUsage returns total and free bytes for the storage filesystem
func (s *FileService) getFileSystemUsage() (total, free uint64, err error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(s.storageDir, &stat); err != nil {
		return 0, 0, err
	}
	// Available blocks * size per block = available space in bytes
	// Total blocks * size per block = total space in bytes
	free = uint64(stat.Bavail) * uint64(stat.Bsize)
	total = uint64(stat.Blocks) * uint64(stat.Bsize)
	return total, free, nil
}

// GetStorageStats получает статистику использования хранилища
func (s *FileService) GetStorageStats(userID uint) (*models.StorageStats, error) {
	stats, err := s.fileRepo.GetStorageStats(userID)
	if err != nil {
		return nil, err
	}

	// Add logical limit
	stats.Limit = s.storageLimit

	// Add physical stats
	total, free, err := s.getFileSystemUsage()
	if err != nil {
		fmt.Printf("Warning: failed to get disk usage: %v\n", err)
	} else {
		stats.PhysicalTotal = int64(total)
		stats.PhysicalFree = int64(free)
	}

	return stats, nil
}
