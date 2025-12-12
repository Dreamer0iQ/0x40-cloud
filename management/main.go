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
	// Program starts here
	// This is a placeholder for the actual TUI implementation
	// We will use 'huh' for forms and 'bubbletea' for the main menu loop if needed, 
	// or just a simple loop with 'huh' selects.
	
	// Check/Load .env
	loadEnv()

	for {
		// Main Menu
		action := ""
		form := huh.NewForm(
			huh.NewGroup(
				huh.NewSelect[string]().
					Title("0x40 Cloud Management").
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
		)

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
    
    // 3. Disk Usage (of the volume) - tricky from inside container without mounting volume root,
    // but we can try 'docker system df -v' if socket is mounted, or just show the limit.
    // For now, let's show what we know.
    
    fmt.Println("\n=== STATUS ===")
    fmt.Printf("Backend Status: %s\n", status)
    fmt.Printf("Port: %s\n", port)
    fmt.Printf("Registration Disabled: %s\n", regDisabled)
    fmt.Printf("Storage Limit: %s bytes\n", diskLimit)
    // TODO: Get Admin Info (maybe query DB container? or just show instructions)
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
                Title("Are you sure? This will invalidate all existing sessions.").
                Value(&confirm),
        ),
    ).Run()
    
    if confirm {
        // Generate random strings (simplified for this snippet)
        // In real Go code we'd use crypto/rand
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
    ).Run()
    
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
    ).Run()
    
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
        exec.Command("docker", "compose", "-f", "/app/workdir/docker-compose.yml", "stop").Run()
        fmt.Println("Stopped.")
    } else {
         fmt.Println("Starting cloud...")
        exec.Command("docker", "compose", "-f", "/app/workdir/docker-compose.yml", "start").Run()
        fmt.Println("Started.")
    }
}


func updateEnv(key, value string) {
    // Basic sed implementation for demo. In real production code, parse and rewrite cleanly.
    // Assuming .env is simpler key=value
    // os.Setenv for current process
    os.Setenv(key, value)
    
    // Write to file
    // We use sed to replace the line. 
    // This is fragile but works for the assumed simple .env structure.
    cmd := exec.Command("sed", "-i", fmt.Sprintf("s/^%s=.*/%s=%s/", key, key, value), "/app/workdir/.env")
    if err := cmd.Run(); err != nil {
        // If sed fails (maybe key doesn't exist), append it
         f, _ := os.OpenFile("/app/workdir/.env", os.O_APPEND|os.O_WRONLY, 0600)
         defer f.Close()
         f.WriteString(fmt.Sprintf("\n%s=%s", key, value))
    }
}

func restartContainer() {
    // Trigger docker compose up -d to apply changes
    cmd := exec.Command("docker", "compose", "-f", "/app/workdir/docker-compose.yml", "up", "-d")
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    cmd.Run()
}
