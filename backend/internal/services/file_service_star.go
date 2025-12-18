package services

import (
	"fmt"
	"path/filepath"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/google/uuid"
)

func (s *FileService) ToggleStarred(fileID uuid.UUID, userID uint) (bool, error) {
	_, err := s.GetFile(fileID, userID)
	if err != nil {
		return false, err
	}

	isStarred, err := s.starredRepo.IsStarred(userID, fileID)
	if err != nil {
		return false, fmt.Errorf("failed to check starred status: %w", err)
	}

	if isStarred {
		if err := s.starredRepo.Delete(userID, fileID); err != nil {
			return false, fmt.Errorf("failed to unstar file: %w", err)
		}
		return false, nil
	} else {
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

func (s *FileService) GetStarredFiles(userID uint) ([]models.File, error) {
	files, err := s.starredRepo.FindStarredFilesByUserID(userID)
	if err != nil {
		return nil, err
	}

	for i := range files {
		files[i].IsStarred = true
	}

	starredFolders, err := s.starredFolderRepo.FindStarredFoldersByUserID(userID)
	if err != nil {
		return nil, err
	}

	for _, sf := range starredFolders {
		path := sf.FolderPath
		
		if path == "/" {
			continue
		}
		
		cleanPath := path
		if len(cleanPath) > 1 && cleanPath[len(cleanPath)-1] == '/' {
			cleanPath = cleanPath[:len(cleanPath)-1]
		}
		
		dir, file := filepath.Split(cleanPath)
		
		folderFile := models.File{
			OriginalName: file,
			VirtualPath:  dir,
			FolderName:   file,
			MimeType:     "inode/directory",
			IsStarred:    true,
		}
		files = append(files, folderFile)
	}

	return files, nil
}

func (s *FileService) EnrichFilesWithStarred(files []models.File, userID uint) ([]models.File, error) {
	if len(files) == 0 {
		return files, nil
	}

	fileIDs := make([]uuid.UUID, 0)
	folderPaths := make([]string, 0)
    folderIndexMap := make(map[string][]int)

	for i, file := range files {
		if file.MimeType == "inode/directory" {
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

func (s *FileService) ToggleStarredFolder(virtualPath string, userID uint) (bool, error) {
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
