. (Join-Path $PSScriptRoot 'windows-utils.ps1')
Assert-Administrator

$windowHtml = Find-VivaldiWindowHtml
$vivaldiDir = Split-Path $windowHtml -Parent
$modDir = Join-Path $vivaldiDir 'user-tab-colors'
$marker = '<!-- user-tab-colors-mod -->'

New-Item -ItemType Directory -Path $modDir -Force | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'tab-colors.js') (Join-Path $modDir 'tab-colors.js') -Force
Copy-Item (Join-Path $PSScriptRoot 'tab-colors.css') (Join-Path $modDir 'tab-colors.css') -Force

$content = [IO.File]::ReadAllText($windowHtml)
if (-not $content.Contains($marker)) {
    Copy-Item $windowHtml "$windowHtml.user-tab-colors-backup" -Force
    $injection = "  $marker`r`n  <link rel=`"stylesheet`" href=`"user-tab-colors/tab-colors.css`" />`r`n  <script src=`"user-tab-colors/tab-colors.js`"></script>`r`n"
    $content = $content.Replace('</body>', "$injection</body>")
    Write-Utf8NoBom $windowHtml $content
}

Write-Host 'Installed. Restart Vivaldi.'
