package handlers

import (
	"fmt"
	"net/http"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ShareHandler struct {
	service *services.ShareService
}

func NewShareHandler(service *services.ShareService) *ShareHandler {
	return &ShareHandler{service: service}
}

// CreateShare godoc
// @Summary Create a public share link for a file
// @Security BearerAuth
func (h *ShareHandler) CreateShare(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDRaw.(uint)
	fileID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	var req models.CreateShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	share, err := h.service.CreateShare(userID, fileID, req.Limit, req.ExpiresAt)
	if err != nil {
		fmt.Printf("CreateShare Error: %v\n", err)
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to share this file"})
			return
		}
		if err.Error() == "record not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, share)
}

// GetSharedFile godoc
// @Summary Get shared file info (Public)
func (h *ShareHandler) GetSharedFile(c *gin.Context) {
	token := c.Param("token")
	share, err := h.service.GetSharedFile(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, share)
}

// DownloadSharedFile godoc
// @Summary Download shared file (Public)
func (h *ShareHandler) DownloadSharedFile(c *gin.Context) {
	token := c.Param("token")

	// Set headers for download
	// We need to fetch metadata first to set headers, or let the service handle it?
	// The service streams to writer. We should set headers before calling service.
	// But we need filename and size.

	// Let's get metadata first.
	share, err := h.service.GetSharedFile(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Set headers
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", share.File.OriginalName))
	c.Header("Content-Type", share.File.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", share.File.Size))

	// Stream file
	if _, err := h.service.DownloadSharedFile(token, c.Writer); err != nil {
		// If streaming started, we can't change status code easily.
		// But if it failed immediately, we can.
		// For now log error.
		fmt.Printf("Error downloading shared file: %v\n", err)
	}
}

// RevokeShare godoc
// @Summary Revoke a share link
// @Security BearerAuth
func (h *ShareHandler) RevokeShare(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDRaw.(uint)
	token := c.Param("token")

	if err := h.service.RevokeShare(userID, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Share revoked"})
}

// ListShares godoc
// @Summary List all shares for the user
// @Security BearerAuth
func (h *ShareHandler) ListShares(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDRaw.(uint)
	shares, err := h.service.ListUserShares(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, shares)
}
