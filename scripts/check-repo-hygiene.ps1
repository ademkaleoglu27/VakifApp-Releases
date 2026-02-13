$BlockedPatterns = @(
    "\.apk$", 
    "\.aab$", 
    "\.jks$", 
    "\.keystore$", 
    "\.pem$", 
    "\.p12$", 
    "^builds/", 
    "^android/app/build/", 
    "^android/build/", 
    "^ios/build/"
)

$BlockedRegex = "(" + ($BlockedPatterns -join "|") + ")"
$TrackedFiles = git ls-files

$Violations = @()

foreach ($file in $TrackedFiles) {
    if ($file -match $BlockedRegex) {
        $Violations += $file
    }
}

if ($Violations.Count -gt 0) {
    Write-Host "ERROR: The following tracked files violate repo hygiene rules:" -ForegroundColor Red
    foreach ($v in $Violations) {
        Write-Host " - $v"
    }
    exit 1
} else {
    Write-Host "Repo hygiene OK. No blocked artifacts found in tracked files." -ForegroundColor Green
    exit 0
}
