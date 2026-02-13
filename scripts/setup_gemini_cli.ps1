# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js (v18+) first." -ForegroundColor Red
    exit 1
}

# Install Gemini CLI Globally
Write-Host "Installing Gemini CLI..." -ForegroundColor Cyan
try {
    npm install -g @google/gemini-cli
} catch {
    Write-Host "Error installing Gemini CLI. You might need to run this as Administrator." -ForegroundColor Red
    exit 1
}

# Verify Installation
if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
    Write-Host "Gemini CLI installed but not found in PATH. You might need to restart your terminal." -ForegroundColor Yellow
    # Continue anyway if possible, or exit? 
    # Usually better to exit if we can't run it.
    exit 1
}

Write-Host "Gemini CLI Installed Successfully." -ForegroundColor Green

# Install Extensions
$extensions = @(
    "conductor",
    "security",
    "github",
    "firebase",
    "code-review"
)

Write-Host "Installing Extensions..." -ForegroundColor Cyan
foreach ($ext in $extensions) {
    Write-Host "Installing extension: $ext" -ForegroundColor Yellow
    gemini install $ext
}

Write-Host "All done! Run 'gemini login' to authenticate." -ForegroundColor Green
gemini list
