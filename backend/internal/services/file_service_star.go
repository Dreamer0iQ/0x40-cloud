package services

import (
	"fmt"
	"path/filepath"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/google/uuid"
)

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

// GetStarredFiles получает все избранные файлы и папки пользователя
func (s *FileService) GetStarredFiles(userID uint) ([]models.File, error) {
	// 1. Get starred files
	files, err := s.starredRepo.FindStarredFilesByUserID(userID)
	if err != nil {
		return nil, err
	}

	for i := range files {
		files[i].IsStarred = true
	}

	// 2. Get starred folders
	starredFolders, err := s.starredFolderRepo.FindStarredFoldersByUserID(userID)
	if err != nil {
		return nil, err
	}

	// 3. Convert folders to File models and append
	for _, sf := range starredFolders {
		// Parse path to get name and parent path
		// Path format: /foo/bar/
		path := sf.FolderPath
		
		// Ensure cleaning logic matches what we expect
		if path == "/" {
			continue // Root cannot be starred usually, or handle as needed
		}
		
		// Remove trailing slash for splitting
		cleanPath := path
		if len(cleanPath) > 1 && cleanPath[len(cleanPath)-1] == '/' {
			cleanPath = cleanPath[:len(cleanPath)-1]
		}
		
		dir, file := filepath.Split(cleanPath)
		// dir will be "/foo/" and file will be "bar"
		
		folderFile := models.File{
			OriginalName: file,
			VirtualPath:  dir,
			FolderName:   file, // Or maybe keep empty? usually folder_name is redundant here
			MimeType:     "inode/directory",
			IsStarred:    true,
            // ID is empty/zero for folders usually, or generates on fly. 
            // Ideally frontend uses name/path key.
		}
		files = append(files, folderFile)
	}

	return files, nil
}

// EnrichFilesWithStarred добавляет информацию о starred к списку файлов
func (s *FileService) EnrichFilesWithStarred(files []models.File, userID uint) ([]models.File, error) {
	if len(files) == 0 {
		return files, nil
	}

	// Собираем ID файлов и Пути папок
	fileIDs := make([]uuid.UUID, 0)
	folderPaths := make([]string, 0)
    
    // Map to quickly find folder index by path
    folderIndexMap := make(map[string][]int)

	for i, file := range files {
		if file.MimeType == "inode/directory" {
            // Construct full path for folder
            // VirtualPath is parent path, e.g. "/". OriginalName is "foo". Full: "/foo/"
            // Or "/bar/". OriginalName "baz". Full: "/bar/baz/"
            fullPath := file.VirtualPath
            if fullPath != "/" && len(fullPath) > 0 && fullPath[len(fullPath)-1] != '/' {
                fullPath += "/"
            }
            if file.VirtualPath == "/" {
                fullPath = "/" + file.OriginalName + "/"
            } else {
                 fullPath = fullPath + file.OriginalName + "/"
            }
            
            folderPaths = append(folderPaths, fullPath)
            folderIndexMap[fullPath] = append(folderIndexMap[fullPath], i)
		} else {
			fileIDs = append(fileIDs, file.ID)
		}
	}

    // Enrich Files
	if len(fileIDs) > 0 {
		starredMap, err := s.starredRepo.GetStarredMap(userID, fileIDs)
		if err != nil {
			return files, fmt.Errorf("failed to get starred files map: %w", err)
		}
		for i := range files {
			if files[i].MimeType != "inode/directory" {
				files[i].IsStarred = starredMap[files[i].ID]
			}
		}
	}

    // Enrich Folders
    if len(folderPaths) > 0 {
        starredFolderMap, err := s.starredFolderRepo.GetStarredMap(userID, folderPaths)
        if err != nil {
             return files, fmt.Errorf("failed to get starred folders map: %w", err)
        }
        for path, isStarred := range starredFolderMap {
            if indices, ok := folderIndexMap[path]; ok {
                for _, idx := range indices {
                    files[idx].IsStarred = isStarred
                }
            }
        }
    }

	return files, nil
}

// ToggleStarredFolder переключает статус избранного для папки
func (s *FileService) ToggleStarredFolder(virtualPath string, userID uint) (bool, error) {
    // virtualPath must be full path to folder, e.g. /my-folder/
    
    // Check if starred
    isStarred, err := s.starredFolderRepo.IsStarred(userID, virtualPath)
    if err != nil {
        return false, err
    }

    if isStarred {
        if err := s.starredFolderRepo.Delete(userID, virtualPath); err != nil {
             return false, err
        }
        return false, nil
    } else {
        starredFolder := &models.StarredFolder{
            UserID: userID,
            FolderPath: virtualPath,
        }
        if err := s.starredFolderRepo.Create(starredFolder); err != nil {
            return false, err
        }
        return true, nil
    }
}
