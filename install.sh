#!/bin/bash
set -e

# Enhanced Colors for "Restrained but colorful" look
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper for nice headers
function print_header() {
    echo -e "\n${BOLD}${PURPLE}:: ${CYAN}$1 ${PURPLE}::${NC}"
}
function print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}
function print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}
function print_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}
function print_error() {
    echo -e "${RED}✖ $1${NC}"
}

# ASCII Logo
echo -e "${BOLD}${CYAN}
  __  _  _  ___   __         ___  __     __   _  _  ____ 
 /  \( \/ )/ _ \ /  \  ___  / __)(  )   /  \ / )( \(    \\
(  0 ))  ((__  ((  0 )(___)( (__ / (_/\(  O )) \/ ( ) D (
 \__/(_/\_) (__/ \__/       \___)\____/ \__/ \____/(____/
                              
${NC}"
echo -e "${BOLD}${CYAN}=== Personal Cloud Installer ===${NC}"

# 1. Check/Install Docker
print_header "Checking Prerequisites"
if ! command -v docker &> /dev/null; then
    print_warn "Docker is not installed. Installing..."
    if command -v curl &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    elif command -v wget &> /dev/null; then
        wget -qO- https://get.docker.com | sh
    else
        print_error "Error: neither curl nor wget found. Cannot install Docker."
        exit 1
    fi
    print_success "Docker installed successfully."
    
    if command -v systemctl &> /dev/null; then
        sudo systemctl start docker || true
        sudo systemctl enable docker || true
    fi
else
    print_success "Docker is already installed."
fi

# 2. Clone Repository
INSTALL_DIR="0x40-cloud"
REPO_URL="https://github.com/Dreamer0iQ/0x40-cloud.git"

print_header "Setting up Repository"
if [ -d "$INSTALL_DIR" ]; then
    print_info "Directory $INSTALL_DIR already exists. Updating..."
    cd "$INSTALL_DIR"
    git pull
    print_success "Updated successfully."
else
    print_info "Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    print_success "Cloned successfully."
fi

# 3. Setup .env if missing
print_header "Configuration"
if [ ! -f ".env" ]; then
    print_info "Creating default .env..."
    echo "PORT=8080" > .env
    echo "DB_PASSWORD=postgres" >> .env
    echo "JWT_SECRET=change-this-secret-key" >> .env
    echo "ENCRYPTION_KEY=12345678901234567890123456789012" >> .env
    echo "STORAGE_LIMIT_BYTES=10737418240" >> .env
    echo "MAX_UPLOAD_SIZE=1073741824" >> .env
    echo "DISABLE_REGISTRATION=false" >> .env
    # Get Public IP for CORS
    PUBLIC_IP=$(curl -s https://api.ipify.org || echo "localhost")
    echo "ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://$PUBLIC_IP:3000" >> .env
    print_success ".env file created with defaults."
else
    print_info ".env file already exists. Skipping."
fi

# 4. Preparing Management Image
print_header "Preparing Management Interface"

# Try multiple possible image names (case sensitivity matters in ghcr.io)
IMAGE_NAMES=(
    "ghcr.io/dreamer0iq/0x40-cloud/management:latest"
    "ghcr.io/Dreamer0iQ/0x40-cloud/management:latest"
)
LOCAL_IMAGE_NAME="0x40-cloud-management:latest"
FINAL_IMAGE=""

# Try to pull from registry with different name variations
# Try to pull from registry (Commented out to ensure we use the latest local code with fixes)
# for IMAGE_NAME in "${IMAGE_NAMES[@]}"; do
#     print_info "Trying to pull $IMAGE_NAME..."
#     if docker pull "$IMAGE_NAME" 2>/dev/null; then
#         print_success "Management image pulled successfully from registry."
#         FINAL_IMAGE="$IMAGE_NAME"
#         break
#     fi
# done

# If pull failed, build locally
if [ -z "$FINAL_IMAGE" ]; then
    # print_warn "Could not pull image from registry. Building locally..."
    print_info "Building management interface from source (ensuring latest version)..."
    
    # Build the management image locally
    if docker build -t "$LOCAL_IMAGE_NAME" ./management/; then
        print_success "Management image built successfully."
        FINAL_IMAGE="$LOCAL_IMAGE_NAME"
    else
        print_error "Failed to build management image."
        print_warn "Troubleshooting:"
        echo -e "   1. Check if Docker daemon is running"
        echo -e "   2. Ensure you have enough disk space"
        echo -e "   3. Check management/Dockerfile for errors"
        exit 1
    fi
fi

# 5. Create Global Command (0x40-cloud)
print_header "System Integration"
print_info "Creating global command '0x40-cloud'..."
INSTALL_PATH="$(pwd)"
cat << EOF | sudo tee /usr/local/bin/0x40-cloud > /dev/null
#!/bin/bash
docker run -it --rm \\
    -v /var/run/docker.sock:/var/run/docker.sock \\
    -v "$INSTALL_PATH:/app/workdir" \\
    $FINAL_IMAGE
EOF
sudo chmod +x /usr/local/bin/0x40-cloud
print_success "Command '0x40-cloud' installed!"

# 6. Run Management TUI
print_header "Launch"
print_info "Starting Management Interface..."
echo -e "${CYAN}Use the arrow keys to navigate the menu.${NC}"
echo -e "${YELLOW}Tip: Select 'Start/Stop Cloud' to launch all services.${NC}"
echo ""

# Run directly
docker run -it --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$(pwd):/app/workdir" \
    $FINAL_IMAGE

# Get Public IP
PUBLIC_IP=$(curl -s https://api.ipify.org || echo "YOUR_SERVER_IP")

print_header "Installation Complete"
print_success "You can run '0x40-cloud' anytime to manage your cloud."
echo ""
echo -e "${CYAN}Quick commands:${NC}"
echo -e "  ${BOLD}0x40-cloud${NC}           - Open management interface"
echo -e "  ${BOLD}cd ~/0x40-cloud${NC}      - Go to project directory"
echo -e "  ${BOLD}docker compose up -d${NC} - Start all services manually"
echo -e "  ${BOLD}docker ps${NC}            - Check running containers"
echo ""
echo -e "${CYAN}Access your cloud:${NC}"
echo -e "  Frontend: ${BOLD}http://$PUBLIC_IP:3000${NC}"
echo -e "  Backend:  ${BOLD}http://$PUBLIC_IP:8080${NC}"
echo ""
