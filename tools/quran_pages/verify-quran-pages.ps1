<#
.SYNOPSIS
    Verifies the existence of all 604 Quran page WebP assets.

.DESCRIPTION
    Checks the assets/quran_pages directory for files 001.webp to 604.webp.
    Can optionally open a sample page to verify visual integrity.

.PARAMETER ProjectRoot
    Root directory of the VakifApp project.

.PARAMETER OpenSample
    If set, opens page 536.webp (if it exists) in the default viewer.

.EXAMPLE
    .\verify-quran-pages.ps1 -ProjectRoot "C:\VakifApp" -OpenSample
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot,

    [switch]$OpenSample
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

$AssetsDir = Join-Path $ProjectRoot "assets\quran_pages"

Write-Log "Verifying Quran Pages in: $AssetsDir" "Cyan"

if (-not (Test-Path $AssetsDir)) {
    Write-Log "Error: Directory does not exist." "Red"
    exit 1
}

$Missing = @()
for ($i = 1; $i -le 604; $i++) {
    $Num = $i.ToString("000")
    $File = Join-Path $AssetsDir "$Num.webp"
    
    if (-not (Test-Path $File)) {
        $Missing += $Num
    }
}

if ($Missing.Count -gt 0) {
    Write-Log "FAILED: Missing $($Missing.Count) pages." "Red"
    Write-Log "Missing: $($Missing -join ', ')" "Yellow"
    exit 1
}

Write-Log "SUCCESS: All 604 pages are present." "Green"

if ($OpenSample) {
    $SamplePage = Join-Path $AssetsDir "536.webp"
    if (Test-Path $SamplePage) {
        Write-Log "Opening sample page: $SamplePage" "Cyan"
        Invoke-Item $SamplePage
    } else {
        Write-Log "Sample page 536 not found (unexpected)." "Yellow"
    }
}
