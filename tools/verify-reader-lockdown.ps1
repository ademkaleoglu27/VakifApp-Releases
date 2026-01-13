
# tools/verify-reader-lockdown.ps1

function Test-Fail {
    param($msg)
    Write-Host "FAIL: $msg" -ForegroundColor Red
    exit 1
}

function Test-Pass {
    param($msg)
    Write-Host "PASS: $msg" -ForegroundColor Green
}

# 0. Check VakifApp-Assets (Must be GONE)
if (Test-Path "VakifApp-Assets") {
    Test-Fail "VakifApp-Assets folder MUST be deleted."
} else {
    Test-Pass "VakifApp-Assets folder is gone."
}

$root = "src"
$badStrings = @(
    "RisalePdfReader",
    "RisaleReader",
    "DevReaderIsolation",
    "ReaderDevMenu",
    "react-native-pdf",
    "assets/risale_pdfs",
    "QuranPdfReader",
    "DuaPdfReader",
    "pressCount"
)

Write-Host "Verifying Reader Lockdown..."

# 1. Search for forbidden strings in src
$foundForbidden = $false
foreach ($b in $badStrings) {
    $result = cmd /c "findstr /S /M /I `"$b`" src\*.ts src\*.tsx"
    if ($LASTEXITCODE -eq 0) { 
        Write-Host "FAIL: Found forbidden string '$b' in:" -ForegroundColor Red
        $result | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
        $foundForbidden = $true
    }
}

if ($foundForbidden) {
    Test-Fail "Forbidden strings found in source code."
}

# 2. Check for Forbidden Files
$forbiddenFiles = @(
    "src\features\risale\screens\RisaleHomeScreen.tsx",
    "src\features\risale\screens\WorkDetailScreen.tsx",
    "src\features\library\screens\RisalePdfReaderScreen.tsx",
    "src\features\quran\screens\QuranPdfScreen.tsx",
    "src\features\debug\screens\ReaderDevMenuScreen.tsx"
)

foreach ($f in $forbiddenFiles) {
    if (Test-Path $f) {
        Test-Fail "File exists: $f"
    } else {
        Test-Pass "File verified gone: $f"
    }
}

# 3. Check for PDF assets
if (Test-Path "assets\risale_pdfs\sozler.pdf") {
    Test-Fail "PDF asset still exists: assets\risale_pdfs\sozler.pdf"
} else {
    Test-Pass "PDF assets cleared."
}

# 4. Check AppNavigator for specific routes (Active check via text search)
$navContent = Get-Content "src\navigation\AppNavigator.tsx" -Raw
if ($navContent -match "name=`"RisalePdfReader`"") {
    Test-Fail "AppNavigator still has RisalePdfReader route"
}
if ($navContent -match "name=`"RisaleHome`"") {
    Test-Fail "AppNavigator still has RisaleHome route"
}

Write-Host "VERIFICATION SUCCESS: No forbidden items found." -ForegroundColor Green
exit 0
