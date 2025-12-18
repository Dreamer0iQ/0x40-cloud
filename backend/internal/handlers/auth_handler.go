package handlers

import (
	"net/http"
	"strings"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func getValidationError(err error) string {
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			switch fieldError.Tag() {
			case "required":
				return fieldError.Field() + " is required"
			case "email":
				return "Invalid email format"
			case "min":
				return fieldError.Field() + " is too short"
			case "max":
				return fieldError.Field() + " is too long"
			case "eqfield":
				return "Passwords do not match"
			}
		}
	}
	if strings.Contains(err.Error(), "email") {
		return "Invalid email format"
	}
	return "Invalid input data"
}

func (h *AuthHandler) Register(c *gin.Context) {
	// Check if registration is disabled
	if h.authService.Config.Auth.DisableRegistration {
		c.JSON(http.StatusForbidden, gin.H{"error": "Registration is disabled"})
		return
	}

	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": getValidationError(err)})
		return
	}

	response, err := h.authService.Register(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set JWT token as httpOnly cookie
	h.setAuthCookie(c, response.Token)

	c.JSON(http.StatusCreated, gin.H{
		"user": response.User,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": getValidationError(err)})
		return
	}

	response, err := h.authService.Login(&req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Set JWT token as httpOnly cookie
	h.setAuthCookie(c, response.Token)

	c.JSON(http.StatusOK, gin.H{
		"user": response.User,
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie(
		"auth_token",
		"",
		-1, // expires immediately
		"/",
		"",
		false, // secure (false to support HTTP)
		true,  // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

func (h *AuthHandler) setAuthCookie(c *gin.Context, token string) {
	maxAge := 24 * 60 * 60

	c.SetCookie(
		"auth_token", // name
		token,        // value
		maxAge,       // max age in seconds
		"/",          // path
		"",           // domain (empty = current domain)
		false,        // secure (false to support HTTP)
		true,         // httpOnly (not accessible via JavaScript)
	)

	// Also set SameSite policy - Lax for cross-origin support
	c.Writer.Header().Set("Set-Cookie",
		c.Writer.Header().Get("Set-Cookie")+"; SameSite=Lax")
}
