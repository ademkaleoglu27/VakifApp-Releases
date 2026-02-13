#!/bin/bash

# Configuration
FILE_PATH="C:\\VakifApp\\kuran_v2_lite.pdf"
TAG_NAME="v1.0.0"
TITLE="v1.0.0"
NOTES="Optimized Quran PDF (22MB)"

# Check if file exists (using ls for git bash compatibility with win paths)
if ! ls "$FILE_PATH" >/dev/null 2>&1; then
  echo "Error: File not found at $FILE_PATH"
  exit 1
fi

echo "Uploading $FILE_PATH to release $TAG_NAME..."

# Create release if not exists, or verify it exists
# We use 'release create' with the file. If tag exists, it might fail or we might need to edit.
# The user asked for "Create the release if it doesn't exist" and "Overwrite: --clobber".
# 'gh release create' handles creation. safely.

gh release create "$TAG_NAME" "$FILE_PATH" \
  --title "$TITLE" \
  --notes "$NOTES" \
  --clobber

echo "Upload complete."
echo "Getting download URL..."

# Get the download URL
gh release view "$TAG_NAME" --json assets --jq '.assets[] | select(.name=="kuran_v2_lite.pdf") | .url'
