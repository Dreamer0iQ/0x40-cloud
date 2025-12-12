#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 0x40 Cloud Installer ===${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker and Docker Compose before running this script."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Define URLs
REPO_RAW_URL="https://raw.githubusercontent.com/Dreamer0iQ/0x40-cloud/main"

# 1. Download docker-compose.yml if not exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${BLUE}Downloading docker-compose.yml...${NC}"
    curl -sL "$REPO_RAW_URL/docker-compose.yml" -o docker-compose.yml
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download docker-compose.yml. Using local copy if available or exiting.${NC}"
        # Fallback check for local dev
        if [ ! -f "docker-compose.yml" ]; then
             echo -e "${RED}Critical: docker-compose.yml not found.${NC}"
             exit 1
        fi
    fi
fi

# 2. Setup .env
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating default .env...${NC}"
    echo "PORT=8080" > .env
    echo "DB_PASSWORD=postgres" >> .env
    echo "JWT_SECRET=change-this-secret-key" >> .env
    echo "ENCRYPTION_KEY=12345678901234567890123456789012" >> .env # 32 chars
    echo "STORAGE_LIMIT_BYTES=10737418240" >> .env # 10GB
    echo "MAX_UPLOAD_SIZE=1073741824" >> .env # 1GB
    echo "DISABLE_REGISTRATION=false" >> .env
    echo -e "${GREEN}.env created.${NC}"
fi

# 3. Pull and Run the Management TUI
echo -e "${BLUE}Starting Management TUI...${NC}"

# Note: In a real scenario, we'd pull a pre-built image. 
# For this task, we assume the user has the source or we build it on the fly.
# Since the prompt implies "sshnik downloads docker container", we'll try to use a pre-built image
# OR build it if we are in the dev environment.

# Let's check if we are in the project root
if [ -d "management" ]; then
   echo "Building Management TUI..."
   docker build -t 0x40-management ./management > /dev/null 2>&1
else
   # If we are just a user with curl, we need to pull the image.
   # For now, I'll simulate pulling by assuming it exists or pulling from a placeholder.
   # Since I can't push to dockerhub, I will instructing the script to try to build from a temp dir if source is missing?
   # User said "sshnik downloads docker container". So implies `docker pull`.
   
   # IMPORTANT: Since I cannot push to DockerHub, I will assume the image name is `dreamer0iq/0x40-management:latest`
   # But since it doesn't exist, I'll add a fallback to build from a temporary clone for this demo.
   
   echo "Pulling management tool..."
   if ! docker pull dreamer0iq/0x40-management:latest; then
        echo -e "${RED}Could not pull image. Cloning source to build locally...${NC}"
        git clone https://github.com/Dreamer0iQ/0x40-cloud.git /tmp/0x40-cloud-temp
        docker build -t dreamer0iq/0x40-management:latest /tmp/0x40-cloud-temp/management
        rm -rf /tmp/0x40-cloud-temp
   fi
fi

# Run the TUI
# We mount docker socket to control sibling containers
# We mount current dir to access .env and docker-compose.yml
docker run -it --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$(pwd):/app/workdir" \
    dreamer0iq/0x40-management:latest

echo -e "${GREEN}Done.${NC}"
