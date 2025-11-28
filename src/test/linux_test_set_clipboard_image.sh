#!/bin/bash
# Linux clipboard image setter for tests
# Usage: linux_test_set_clipboard_image.sh <base64-string>

base64=$1

# Create a temporary file for the PNG data
tmpfile=$(mktemp /tmp/clipboard_image_XXXXXX.png)

# Decode base64 and write to temp file
echo "$base64" | base64 -d > "$tmpfile"

# Copy the file to clipboard in background with timeout
# Use -loops 1 to prevent xclip from running indefinitely
timeout 2s xclip -selection clipboard -t image/png -i "$tmpfile" -loops 1 2>/dev/null || true

# Clean up temp file
rm -f "$tmpfile"
