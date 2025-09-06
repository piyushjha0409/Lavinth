#!/bin/bash

# Simple Solana Dust Detector Cron Script
# This script runs the solana-dust-detector.js file with minimal logging

# Set script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_DIR}/dust-detector.log"

# Function to log messages with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    # Only print start and end messages to console
    if [[ "$2" == "console" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    fi
}

log_message "Starting Solana Dust Detector analysis..." console

# Change to project directory
cd "$PROJECT_DIR" || {
    log_message "ERROR: Could not change to project directory: $PROJECT_DIR" console
    exit 1
}

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    log_message "Loading environment variables from .env file"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the dust detector from the dist folder
log_message "Executing dust detector analysis..."
# Redirect stdout to /dev/null but capture stderr for error logging
node "${PROJECT_DIR}/dist/solana-dust-detector.js" > /dev/null 2> /tmp/dust-detector-error.log
EXIT_CODE=$?

# Only log errors if they occur
if [ $EXIT_CODE -ne 0 ]; then
    log_message "ERROR: Dust detector analysis failed with exit code: $EXIT_CODE" console
    log_message "Error details: $(cat /tmp/dust-detector-error.log | head -n 5)"
    # Clean up temp file
    rm /tmp/dust-detector-error.log
else
    log_message "SUCCESS: Dust detector analysis completed successfully" console
fi

log_message "Dust detector cron job completed" console
exit $EXIT_CODE
