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
    port := os.Getenv("PORT")
    diskLimit := os.Getenv("STORAGE_LIMIT_BYTES")
    regDisabled := os.Getenv("DISABLE_REGISTRATION")
    
    fmt.Println("\n=== STATUS ===")
    fmt.Printf("Backend Status: %s\n", status)
    fmt.Printf("Port: %s\n", port)
    fmt.Printf("Registration Disabled: %s\n", regDisabled)
    fmt.Printf("Storage Limit: %s bytes\n", diskLimit)
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
    var newPort string
    huh.NewForm(
        huh.NewGroup(
            huh.NewInput().
                Title("Enter new port").
                Value(&newPort),
        ),
    ).WithTheme(huh.ThemeDracula()).Run()
    
    if newPort != "" {
        updateEnv("PORT", newPort)
        fmt.Println("Port updated. Restarting...")
        restartContainer()
    }
}

func editQuotas() {
    var storageLimit string
    var maxUpload string
    
    huh.NewForm(
        huh.NewGroup(
            huh.NewInput().
                Title("Total Storage Limit (bytes)").
                Description("Default: 10GB = 10737418240").
                Value(&storageLimit),
            huh.NewInput().
                Title("Max Upload Size (bytes)").
                Description("Default: 1GB = 1073741824").
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
            fmt.Println("✓ Cloud started successfully!")
            fmt.Println("  Frontend: http://localhost:3000")
            fmt.Println("  Backend:  http://localhost:8080")
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
