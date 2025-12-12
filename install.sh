#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 0x40 Cloud Installer ===${NC}"

# 1. Check/Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}Docker is not installed. Installing...${NC}"
    if command -v curl &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    elif command -v wget &> /dev/null; then
        wget -qO- https://get.docker.com | sh
    else
        echo -e "${RED}Error: neither curl nor wget found. Cannot install Docker.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Docker installed successfully.${NC}"
    
    if command -v systemctl &> /dev/null; then
        sudo systemctl start docker || true
        sudo systemctl enable docker || true
    fi
fi

# 2. Clone Repository (Since it is now PUBLIC)
INSTALL_DIR="0x40-cloud"
REPO_URL="https://github.com/Dreamer0iQ/0x40-cloud.git"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${BLUE}Directory $INSTALL_DIR already exists. Updating...${NC}"
    cd "$INSTALL_DIR"
    git pull
else
    echo -e "${BLUE}Cloning repository...${NC}"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 3. Setup .env if missing
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating default .env...${NC}"
    echo "PORT=8080" > .env
    echo "DB_PASSWORD=postgres" >> .env
    echo "JWT_SECRET=change-this-secret-key" >> .env
    echo "ENCRYPTION_KEY=12345678901234567890123456789012" >> .env
    echo "STORAGE_LIMIT_BYTES=10737418240" >> .env
    echo "MAX_UPLOAD_SIZE=1073741824" >> .env
    echo "DISABLE_REGISTRATION=false" >> .env
    echo -e "${GREEN}.env created.${NC}"
fi

# 4. Build Management TUI
echo -e "${BLUE}Building Management Tool...${NC}"
if [ ! -f "management/Dockerfile" ]; then
    echo -e "${RED}Error: Management tool sources not found in repository.${NC}"
    exit 1
fi

# Build the management image locally from source
docker build -t 0x40-management ./management > /dev/null

# 5. Create Global Command (0x40-cloud)
echo -e "${BLUE}Creating global command '0x40-cloud'...${NC}"
INSTALL_PATH="$(pwd)"
cat << EOF | sudo tee /usr/local/bin/0x40-cloud > /dev/null
#!/bin/bash
docker run -it --rm \\
    -v /var/run/docker.sock:/var/run/docker.sock \\
    -v "$INSTALL_PATH:/app/workdir" \\
    0x40-management
EOF
sudo chmod +x /usr/local/bin/0x40-cloud
echo -e "${GREEN}Command '0x40-cloud' installed!${NC}"

# 6. Run Management TUI
echo -e "${GREEN}Starting Management Interface...${NC}"
0x40-cloud

echo -e "${GREEN}Done.${NC}"
