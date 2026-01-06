<#
.SYNOPSIS
    Converts Quran page AI files from a ZIP archive to WebP format.

.DESCRIPTION
    Extracts a ZIP file containing Quran page vector files (AI/PDF), converts them 
    to WebP format using ImageMagick, and places them in the project assets directory.
    Ensures exactly 604 pages are generated.

.PARAMETER ZipPath
    Path to the source ZIP file (e.g., "C:\Downloads\quran.zip").

.PARAMETER ProjectRoot
    Root directory of the VakifApp project.

.PARAMETER Density
    DPI density for conversion. Default is 200.

.PARAMETER Quality
    WebP compression quality (0-100). Default is 85.

.EXAMPLE
    .\convert-quran-pages.ps1 -ZipPath "C:\Downloads\quran.zip" -ProjectRoot "C:\VakifApp"
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$ZipPath,

    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot,

    [int]$Density = 200,
    [int]$Quality = 85
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Test-ImageMagick {
    try {
        $version = magick -version
        if ($null -eq $version) { throw "Command returned null" }
        Write-Log "ImageMagick found." "Green"
    }
    catch {
        Write-Log "ImageMagick (magick) is NOT installed or not in PATH." "Red"
        Write-Log "Please install ImageMagick: choco install imagemagick" "Yellow"
        exit 1
    }
}

# 1. Validation
Write-Log "Starting Quran Page Conversion..." "Cyan"

if (-not (Test-Path $ZipPath)) {
    Write-Log "Error: ZipPath '$ZipPath' does not exist." "Red"
    exit 1
}

if (-not (Test-Path $ProjectRoot)) {
    Write-Log "Error: ProjectRoot '$ProjectRoot' does not exist." "Red"
    exit 1
}

Test-ImageMagick

$AssetsDir = Join-Path $ProjectRoot "assets\quran_pages"
if (-not (Test-Path $AssetsDir)) {
    Write-Log "Creating assets directory: $AssetsDir" "Yellow"
    New-Item -ItemType Directory -Force -Path $AssetsDir | Out-Null
}

# 2. Extract to Temp
$TempDir = Join-Path $env:TEMP ("quran_convert_" + [guid]::NewGuid().ToString())
Write-Log "Extracting ZIP to temp: $TempDir" "Cyan"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
    Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force
}
catch {
    Write-Log "Failed to extract ZIP: $_" "Red"
    exit 1
}

# 3. Find and Convert Files
$AiFiles = Get-ChildItem -Path $TempDir -Recurse -Filter "*.ai"
$TotalFiles = $AiFiles.Count
Write-Log "Found $TotalFiles AI files in archive." "Cyan"

$Count = 0
$Errors = 0

foreach ($File in $AiFiles) {
    # Parse page number. Filename format: 001___Hafs39__DM.ai
    if ($File.Name -match "^(\d{3})") {
        $PageNum = $matches[1] # e.g. "001"
        $TargetFile = Join-Path $AssetsDir "$PageNum.webp"
        
        Write-Host -NoNewline "`rConverting Page $PageNum..."

        try {
            # Convert using magick
            # -density set BEFORE input file for vector formats
            $process = Start-Process -FilePath "magick" `
                -ArgumentList "-density", "$Density", "`"$($File.FullName)`"", "-quality", "$Quality", "-define", "webp:lossless=false", "`"$TargetFile`"" `
                -Wait -NoNewWindow -PassThru

            if ($process.ExitCode -ne 0) {
                Write-Host " Failed." -ForegroundColor Red
                $Errors++
            } else {
                # Check output
                if (Test-Path $TargetFile) {
                    $Item = Get-Item $TargetFile
                    if ($Item.Length -lt 5120) { # 5KB check
                        Write-Host " Warning: File too small ($($Item.Length) bytes)." -ForegroundColor Yellow
                        $Errors++
                    } else {
                        $Count++
                    }
                } else {
                    Write-Host " Error: Output not found." -ForegroundColor Red
                    $Errors++
                }
            }
        }
        catch {
            Write-Host " Exception: $_" -ForegroundColor Red
            $Errors++
        }
    } else {
        Write-Log "Skipping file (no leading digits): $($File.Name)" "Yellow"
    }
}
Write-Host "" # Newline after progress

# 4. Verify
Write-Log "Verifying output..." "Cyan"
$MissingPages = @()
for ($i = 1; $i -le 604; $i++) {
    $NumStr = $i.ToString("000")
    $Path = Join-Path $AssetsDir "$NumStr.webp"
    if (-not (Test-Path $Path)) {
        $MissingPages += $NumStr
    }
}

# 5. Cleanup
Write-Log "Cleaning up temp files..." "Cyan"
Remove-Item -Path $TempDir -Recurse -Force

# 6. Report
if ($MissingPages.Count -gt 0) {
    Write-Log "Error: Missing $($MissingPages.Count) pages:" "Red"
    Write-Log ($MissingPages -join ", ") "Red"
    exit 1
}
elseif ($Count -ne 604) {
    Write-Log "Error: Expected 604 processed files, but successful count was $Count." "Red"
    exit 1
}
else {
    Write-Log "SUCCESS: 604/604 pages generated successfully in $AssetsDir" "Green"
}
