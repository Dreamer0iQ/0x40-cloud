package handlers

import (
	"github.com/bhop_dynasty/0x40_cloud/internal/services"
)

type FileHandler struct {
	fileService     *services.FileService
	activityService *services.ActivityService
}

func NewFileHandler(fileService *services.FileService, activityService *services.ActivityService) *FileHandler {
	return &FileHandler{
		fileService:     fileService,
		activityService: activityService,
	}
}
