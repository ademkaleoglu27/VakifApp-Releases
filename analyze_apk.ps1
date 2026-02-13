Add-Type -AssemblyName System.IO.Compression.FileSystem
$path = 'c:\VakifApp\android\app\build\outputs\apk\release\app-release.apk'
$zip = [System.IO.Compression.ZipFile]::OpenRead($path)
$zip.Entries | Select-Object Length, FullName | Sort-Object Length -Descending | Select-Object -First 50 | Format-Table -AutoSize
$zip.Dispose()
