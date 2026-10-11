$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageInfo = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$releaseDirectory = Join-Path $projectRoot 'dist/word-racing'
$archivePath = Join-Path $projectRoot ("dist/word-racing-v{0}-offline.zip" -f $packageInfo.version)
if (-not (Test-Path -LiteralPath (Join-Path $releaseDirectory 'index.html'))) {
    throw 'Run npm run build before packaging.'
}
Compress-Archive -LiteralPath $releaseDirectory -DestinationPath $archivePath -Force
$hashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
$archiveStream = [System.IO.File]::OpenRead($archivePath)
try {
    $checksum = [BitConverter]::ToString($hashAlgorithm.ComputeHash($archiveStream)).Replace('-', '').ToLowerInvariant()
} finally {
    $archiveStream.Dispose()
    $hashAlgorithm.Dispose()
}
Set-Content -LiteralPath "$archivePath.sha256" -Value ("{0}  {1}" -f $checksum, (Split-Path -Leaf $archivePath)) -Encoding ascii
Write-Output "Release archive: $archivePath"
Write-Output "SHA256: $checksum"
