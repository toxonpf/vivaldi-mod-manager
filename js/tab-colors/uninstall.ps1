. (Join-Path $PSScriptRoot 'windows-utils.ps1')
Assert-Administrator

$windowHtml = Find-VivaldiWindowHtml
$vivaldiDir = Split-Path $windowHtml -Parent
$modDir = Join-Path $vivaldiDir 'user-tab-colors'
$content = Remove-TabColorsInjection ([IO.File]::ReadAllText($windowHtml))
Write-Utf8NoBom $windowHtml $content
if (Test-Path $modDir) { Remove-Item -Path $modDir -Recurse -Force }
Write-Host 'Removed. Restart Vivaldi.'
