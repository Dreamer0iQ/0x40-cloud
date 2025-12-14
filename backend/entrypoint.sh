#!/bin/sh
set -e

# Ensure storage directory exists and has correct permissions
mkdir -p /app/storage
chown -R appuser:appuser /app/storage
chmod -R 755 /app/storage

# Switch to appuser and run the server
exec su-exec appuser ./server
