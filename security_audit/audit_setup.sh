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

echo "Tools installed successfully."
