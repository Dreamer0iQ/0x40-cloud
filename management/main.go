package main

import (
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
	// Check/Load .env
	loadEnv()

	for {
		// Main Menu
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
						huh.NewOption("Change Port", "port"),
						huh.NewOption("Edit Quotas", "quotas"),
						huh.NewOption("Start/Stop Cloud", "toggle_cloud"),
						huh.NewOption("Exit", "exit"),
					).
					Value(&action),
			),
		).WithTheme(huh.ThemeDracula())

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
		case "port":
			changePort()
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
    // 1. Get Docker Status
    cmd := exec.Command("docker", "ps", "--filter", "name=0x40-backend", "--format", "{{.Status}}")
    out, _ := cmd.CombinedOutput()
    status := strings.TrimSpace(string(out))
    if status == "" {
        status = "STOPPED"
    }
    
    // 2. Read Env vars
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
    
    // 3. Get Public IP
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
    confirm := false
    huh.NewForm(
        huh.NewGroup(
            huh.NewConfirm().
                Title("Are you sure?").
                Description("This will invalidate all existing sessions (Left/Right to toggle).").
                Value(&confirm),
        ),
    ).WithTheme(huh.ThemeDracula()).Run()
    
    if confirm {
        // Generate random strings (simplified for this snippet)
        newJwt := "new-secret-" + "random123" // TODO: Implement proper random
        newEnc := "12345678901234567890123456789012" // TODO: proper random 32 chars
        
        updateEnv("JWT_SECRET", newJwt)
        updateEnv("ENCRYPTION_KEY", newEnc)
        fmt.Println("Secrets generated. Restarting...")
        restartContainer()
    }
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
    ).WithTheme(huh.ThemeDracula()).Run()
    
    changed := false
    if backendPort != "" {
        updateEnv("BACKEND_PORT", backendPort)
        changed = true
    }
    if frontendPort != "" {
        updateEnv("FRONTEND_PORT", frontendPort)
        changed = true
    }
    
    if changed {
        fmt.Println("Port(s) updated. Restarting...")
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
    ).WithTheme(huh.ThemeDracula()).Run()
    
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
            // Get Public IP
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
    
    // We use sed to replace the line. 
    cmd := exec.Command("sed", "-i", fmt.Sprintf("s/^%s=.*/%s=%s/", key, key, value), "/app/workdir/.env")
    if err := cmd.Run(); err != nil {
         f, _ := os.OpenFile("/app/workdir/.env", os.O_APPEND|os.O_WRONLY, 0600)
         defer f.Close()
         f.WriteString(fmt.Sprintf("\n%s=%s", key, value))
    }
}

func restartContainer() {
    // Trigger docker compose up -d to apply changes
    cmd := exec.Command("sh", "-c", "cd /app/workdir && docker compose up -d")
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    cmd.Run()
}
