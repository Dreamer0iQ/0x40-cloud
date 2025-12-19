package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/joho/godotenv"
)

type model struct {
	choices  []string
	cursor   int
	selected map[int]struct{}
	status   string
	err      error
}

func main() {
	loadEnv()

	for {
		action := ""
		form := huh.NewForm(
			huh.NewGroup(
				huh.NewSelect[string]().
					Title("0x40 Cloud Management").
					Description("Use ↑/↓ and Enter to select.").
					Options(
						huh.NewOption("Status & Info", "status"),
						huh.NewOption("Toggle Registration", "registration"),
						huh.NewOption("Generate New Secrets", "secrets"),
						huh.NewOption("Edit Quotas", "quotas"),
						huh.NewOption("Start/Stop Cloud", "toggle_cloud"),
						huh.NewOption("Exit", "exit"),
					).
					Value(&action),
			),
		).WithTheme(huh.ThemeCatppuccin())

		err := form.Run()
		if err != nil {
			fmt.Println("Error:", err)
			os.Exit(1)
		}

		switch action {
		case "status":
			showStatus()
		case "registration":
			toggleRegistration()
		case "secrets":
			generateSecrets()
		case "quotas":
			editQuotas()
		case "toggle_cloud":
			toggleCloud()
		case "exit":
			fmt.Println("Bye!")
			os.Exit(0)
		}

		fmt.Println("\nPress Enter to return to menu...")
		fmt.Scanln()
	}
}

func loadEnv() {
	// Load .env from workdir
	err := godotenv.Load("/app/workdir/.env")
	if err != nil {
		fmt.Println("Warning: .env not found in /app/workdir")
	}
}

func showStatus() {
	cmd := exec.Command("docker", "ps", "--filter", "name=0x40-backend", "--format", "{{.Status}}")
	out, _ := cmd.CombinedOutput()
	status := strings.TrimSpace(string(out))
	if status == "" {
		status = "STOPPED"
	}

	backendPort := os.Getenv("BACKEND_PORT")
	if backendPort == "" {
		backendPort = "8080"
	}
	frontendPort := os.Getenv("FRONTEND_PORT")
	if frontendPort == "" {
		frontendPort = "3000"
	}
	diskLimit := os.Getenv("STORAGE_LIMIT_BYTES")
	regDisabled := os.Getenv("DISABLE_REGISTRATION")

	publicIP := "localhost"
	ipCmd := exec.Command("curl", "-s", "https://api.ipify.org")
	ipOut, err := ipCmd.Output()
	if err == nil {
		publicIP = strings.TrimSpace(string(ipOut))
	}

	fmt.Println("\n=== STATUS ===")
	fmt.Printf("Backend Status: %s\n", status)
	fmt.Printf("Backend Port: %s\n", backendPort)
	fmt.Printf("Frontend Port: %s\n", frontendPort)
	fmt.Printf("Registration Disabled: %s\n", regDisabled)
	fmt.Printf("Storage Limit: %s bytes\n", diskLimit)
	fmt.Println("\n=== WEB ACCESS ===")
	fmt.Printf("Frontend: http://%s:%s\n", publicIP, frontendPort)
	fmt.Printf("Backend:  http://%s:%s\n", publicIP, backendPort)
}

func toggleRegistration() {
	current := os.Getenv("DISABLE_REGISTRATION")
	newVal := "true"
	if current == "true" {
		newVal = "false"
	}
	updateEnv("DISABLE_REGISTRATION", newVal)
	fmt.Printf("Registration set to %s. Applying changes...\n", newVal)
	restartContainer()
}

func generateSecrets() {
	fmt.Println("\n⚠️  WARNING: Generating new secrets will:")
	fmt.Println("   • Invalidate all existing user sessions (users will need to log in again)")
	fmt.Println("   • Make OLD files unreadable if ENCRYPTION_KEY changes")
	fmt.Println("   • This action cannot be undone!")
	fmt.Println()

	currentJWT := os.Getenv("JWT_SECRET")
	currentEnc := os.Getenv("ENCRYPTION_KEY")

	if currentJWT != "" {
		masked := maskSecret(currentJWT)
		fmt.Printf("Current JWT_SECRET: %s\n", masked)
	}
	if currentEnc != "" {
		masked := maskSecret(currentEnc)
		fmt.Printf("Current ENCRYPTION_KEY: %s\n", masked)
	}
	fmt.Println()

	confirm := false
	huh.NewForm(
		huh.NewGroup(
			huh.NewConfirm().
				Title("Generate new secrets?").
				Affirmative("Yes!").
				Negative("No").
				Value(&confirm),
		),
	).WithTheme(huh.ThemeCatppuccin()).Run()

	if confirm {
		fmt.Println("\n🔐 Generating cryptographically secure secrets...")

		newJwt, err := generateJWTSecret()
		if err != nil {
			fmt.Printf("❌ Error generating JWT secret: %v\n", err)
			return
		}

		newEnc, err := generateEncryptionKey()
		if err != nil {
			fmt.Printf("❌ Error generating encryption key: %v\n", err)
			return
		}

		fmt.Println("\n✅ New secrets generated:")
		fmt.Printf("   JWT_SECRET: %s\n", maskSecret(newJwt))
		fmt.Printf("   ENCRYPTION_KEY: %s\n", maskSecret(newEnc))
		fmt.Println()

		// Update .env file
		updateEnv("JWT_SECRET", newJwt)
		updateEnv("ENCRYPTION_KEY", newEnc)

		fmt.Println("💾 Secrets saved to .env file")
		fmt.Println("🔄 Restarting services to apply changes...")
		restartContainer()
		fmt.Println("\n✓ Done! All users will need to log in again.")
	} else {
		fmt.Println("Cancelled. No changes made.")
	}
}

func generateJWTSecret() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(bytes), nil
}

func generateEncryptionKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	bytes16 := make([]byte, 16)
	if _, err := rand.Read(bytes16); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes16), nil
}

func maskSecret(secret string) string {
	if len(secret) <= 8 {
		return "****"
	}
	return secret[:4] + "..." + secret[len(secret)-4:]
}

func changePort() {
	var backendPort string
	var frontendPort string

	currentBackend := os.Getenv("BACKEND_PORT")
	if currentBackend == "" {
		currentBackend = "8080"
	}
	currentFrontend := os.Getenv("FRONTEND_PORT")
	if currentFrontend == "" {
		currentFrontend = "3000"
	}

	huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Backend Port").
				Description(fmt.Sprintf("Current: %s (leave empty to keep)", currentBackend)).
				Value(&backendPort),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("Frontend Port").
				Description(fmt.Sprintf("Current: %s (leave empty to keep)", currentFrontend)).
				Value(&frontendPort),
		),
	).WithTheme(huh.ThemeCatppuccin()).Run()

	changed := false
	finalFrontendPort := currentFrontend

	if backendPort != "" {
		updateEnv("BACKEND_PORT", backendPort)
		changed = true
	}
	if frontendPort != "" {
		updateEnv("FRONTEND_PORT", frontendPort)
		finalFrontendPort = frontendPort
		changed = true
	}

	if changed {
		// Обновляем CORS с новыми портами
		fmt.Println("Updating CORS configuration...")
		publicIP := "localhost"
		ipCmd := exec.Command("curl", "-s", "https://api.ipify.org")
		if ipOut, err := ipCmd.Output(); err == nil {
			publicIP = strings.TrimSpace(string(ipOut))
		}

		allowedOrigins := fmt.Sprintf("http://localhost:%s,http://localhost:5173,http://localhost:5174,http://%s:%s",
			finalFrontendPort, publicIP, finalFrontendPort)
		updateEnv("ALLOWED_ORIGINS", allowedOrigins)

		fmt.Println("Port(s) and CORS updated. Restarting...")
		restartContainer()
	}
}

func editQuotas() {
	var storageLimit string
	var maxUpload string

	currentStorage := os.Getenv("STORAGE_LIMIT_BYTES")
	if currentStorage == "" {
		currentStorage = "10737418240"
	}
	currentUpload := os.Getenv("MAX_UPLOAD_SIZE")
	if currentUpload == "" {
		currentUpload = "1073741824"
	}

	huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Total Storage Limit (bytes)").
				Description(fmt.Sprintf("Current: %s (10GB = 10737418240)", currentStorage)).
				Value(&storageLimit),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("Max Upload Size (bytes)").
				Description(fmt.Sprintf("Current: %s (1GB = 1073741824)", currentUpload)).
				Value(&maxUpload),
		),
	).WithTheme(huh.ThemeCatppuccin()).Run()

	if storageLimit != "" {
		updateEnv("STORAGE_LIMIT_BYTES", storageLimit)
	}
	if maxUpload != "" {
		updateEnv("MAX_UPLOAD_SIZE", maxUpload)
	}

	if storageLimit != "" || maxUpload != "" {
		fmt.Println("Quotas updated. Restarting...")
		restartContainer()
	}
}

func toggleCloud() {
	status := "unknown"
	cmd := exec.Command("docker", "ps", "--filter", "name=0x40-backend", "--format", "{{.Status}}")
	out, _ := cmd.CombinedOutput()
	if strings.TrimSpace(string(out)) != "" {
		status = "running"
	} else {
		status = "stopped"
	}

	if status == "running" {
		fmt.Println("Stopping cloud...")
		cmd := exec.Command("sh", "-c", "cd /app/workdir && docker compose down")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Run()
		fmt.Println("Stopped.")
	} else {
		fmt.Println("Starting cloud (this may take a few minutes)...")
		cmd := exec.Command("sh", "-c", "cd /app/workdir && docker compose pull")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Run()

		fmt.Println("Launching services...")
		cmd = exec.Command("sh", "-c", "cd /app/workdir && docker compose up -d --build")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			fmt.Printf("Error: %v\n", err)
		} else {
			publicIP := "localhost"
			ipCmd := exec.Command("curl", "-s", "https://api.ipify.org")
			ipOut, err := ipCmd.Output()
			if err == nil {
				publicIP = strings.TrimSpace(string(ipOut))
			}

			fmt.Println("✓ Cloud started successfully!")
			fmt.Printf("  Frontend: http://%s:3000\n", publicIP)
			fmt.Printf("  Backend:  http://%s:8080\n", publicIP)
		}
	}
}

func updateEnv(key, value string) {
	os.Setenv(key, value)

	envPath := "/app/workdir/.env"

	content, err := os.ReadFile(envPath)
	if err != nil {
		os.WriteFile(envPath, []byte(fmt.Sprintf("%s=%s\n", key, value)), 0644)
		return
	}

	lines := strings.Split(string(content), "\n")
	found := false
	newLines := make([]string, 0, len(lines))

	for _, line := range lines {
		if strings.HasPrefix(line, key+"=") {
			newLines = append(newLines, fmt.Sprintf("%s=%s", key, value))
			found = true
		} else {
			newLines = append(newLines, line)
		}
	}

	if !found {
		for len(newLines) > 0 && newLines[len(newLines)-1] == "" {
			newLines = newLines[:len(newLines)-1]
		}
		newLines = append(newLines, fmt.Sprintf("%s=%s", key, value))
	}

	os.WriteFile(envPath, []byte(strings.Join(newLines, "\n")+"\n"), 0644)
}

func restartContainer() {
	fmt.Println("Stopping existing containers...")

	stopCmd := exec.Command("sh", "-c", "cd /app/workdir && docker compose down --remove-orphans 2>/dev/null")
	stopCmd.Stdout = os.Stdout
	stopCmd.Stderr = os.Stderr
	stopCmd.Run()

	forceRemove := exec.Command("sh", "-c", "docker rm -f 0x40-redis 0x40-postgres 0x40-backend 0x40-frontend 2>/dev/null || true")
	forceRemove.Run()

	fmt.Println("Starting containers with new configuration...")
	cmd := exec.Command("sh", "-c", "cd /app/workdir && docker compose up -d")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run()
}
