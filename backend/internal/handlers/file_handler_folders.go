package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/bhop_dynasty/0x40_cloud/internal/utils"
	"github.com/gin-gonic/gin"
)

func (h *FileHandler) GetFilesByPath(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	virtualPath := c.Query("path")
	if virtualPath == "" {
		virtualPath = "/"
	}

	sanitizedPath, err := utils.SanitizePath(virtualPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	files, err := h.fileService.GetFilesByPath(userID.(uint), sanitizedPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"files": files})
}

func (h *FileHandler) ToggleStarredFolder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		Path string `json:"path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	sanitizedPath, err := utils.SanitizePath(req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	if len(sanitizedPath) > 0 && sanitizedPath[len(sanitizedPath)-1] != '/' {
		sanitizedPath += "/"
	}
	if sanitizedPath == "" {
		sanitizedPath = "/"
	}

	isStarred, err := h.fileService.ToggleStarredFolder(sanitizedPath, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"is_starred": isStarred,
		"message":    fmt.Sprintf("folder %s", map[bool]string{true: "starred", false: "unstarred"}[isStarred]),
	})
}

func (h *FileHandler) DownloadFolder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	sanitizedPath, err := utils.SanitizePath(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename=folder.zip")
	c.Header("Content-Type", "application/zip")

	if err := h.fileService.DownloadFolderAsZip(sanitizedPath, userID.(uint), c.Writer); err != nil {
		// Note: if we already started writing zip, this error might not be properly sent as JSON
		log.Printf("Failed to download folder: %v", err)
		return
	}
}

func (h *FileHandler) DeleteFolder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	sanitizedPath, err := utils.SanitizePath(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	if err := h.fileService.DeleteFolder(sanitizedPath, userID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "folder deleted successfully"})
}

func (h *FileHandler) CreateFolder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		Path string `json:"path"`
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	if req.Name == "" || strings.Contains(req.Name, "/") || strings.Contains(req.Name, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder name"})
		return
	}

	sanitizedPath, err := utils.SanitizePath(req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}

	file, err := h.fileService.CreateFolder(userID.(uint), sanitizedPath, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"folder": file})
}
