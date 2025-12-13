#!/bin/bash
echo "Installing security tools..."

# Check if brew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Please install Homebrew first."
    exit 1
fi

echo "Installing Nuclei..."
brew install nuclei

echo "Installing Gosec..."
brew install gosec

echo "Installing Trivy..."
brew install aquasecurity/trivy/trivy


echo "Installing/Updating Nuclei Templates..."
nuclei -update-templates

echo "Checking Python environment..."
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Please install Python3."
    exit 1
fi

# Check for python requests library, install if missing (naive check)
python3 -c "import requests" 2>/dev/null || {
    echo "Installing Python requests library..."
    pip3 install requests --break-system-packages
    pip3 install PyJWT --break-system-packages
}

echo "Tools installed successfully."
