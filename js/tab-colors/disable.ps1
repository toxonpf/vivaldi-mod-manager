. (Join-Path $PSScriptRoot 'windows-utils.ps1')
Assert-Administrator

$windowHtml = Find-VivaldiWindowHtml
$content = Remove-TabColorsInjection ([IO.File]::ReadAllText($windowHtml))
Write-Utf8NoBom $windowHtml $content
Write-Host 'Disabled. Restart Vivaldi.'
