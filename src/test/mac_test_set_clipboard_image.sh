#!/bin/bash
# macOS clipboard image setter for tests
# Usage: mac_test_set_clipboard_image.sh <base64-string>

base64=$1

# Create a temporary file for the PNG data
tmpfile=$(mktemp /tmp/clipboard_image_XXXXXX.png)

# Decode base64 and write to temp file
echo "$base64" | base64 -D > "$tmpfile"

# Use osascript to copy image to clipboard
osascript -e "set the clipboard to (read (POSIX file \"$tmpfile\") as «class PNGf»)"

# Clean up temp file
rm -f "$tmpfile"
