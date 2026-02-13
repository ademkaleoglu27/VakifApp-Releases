# Configuration
$FILE_PATH = "C:\VakifApp\kuran_v2_lite.pdf"
$TAG_NAME = "v1.0.0"
$TITLE = "v1.0.0"
$NOTES = "Optimized Quran PDF (22MB)"

# Check if file exists
if (-not (Test-Path $FILE_PATH)) {
    Write-Host "Error: File not found at $FILE_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading $FILE_PATH to release $TAG_NAME..."

# Create release if not exists, or overwrite
# gh release create handles creation. --clobber overwrites assets.
gh release create "$TAG_NAME" "$FILE_PATH" --title "$TITLE" --notes "$NOTES" --clobber

Write-Host "Upload complete."
Write-Host "Getting download URL..."

# Get the download URL
gh release view "$TAG_NAME" --json assets --jq '.assets[] | select(.name=="kuran_v2_lite.pdf") | .url'
