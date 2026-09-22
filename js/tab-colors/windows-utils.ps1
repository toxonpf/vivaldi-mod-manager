Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator privileges are required.'
    }
}

function Find-VivaldiWindowHtml {
    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'Vivaldi\Application'),
        (if ($env:ProgramFiles) { Join-Path $env:ProgramFiles 'Vivaldi\Application' }),
        (if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'Vivaldi\Application' })
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($application in $roots) {
        $direct = Join-Path $application 'resources\vivaldi\window.html'
        if (Test-Path $direct) { return $direct }

        $versions = Get-ChildItem -Path $application -Directory | Where-Object { $_.Name -match '^\d+(\.\d+)+$' } | Sort-Object { [version]$_.Name } -Descending
        foreach ($version in $versions) {
            $candidate = Join-Path $version.FullName 'resources\vivaldi\window.html'
            if (Test-Path $candidate) { return $candidate }
        }
    }
    throw 'Vivaldi window.html was not found.'
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
}

function Remove-TabColorsInjection([string]$Content) {
    $Content = $Content -replace '(?m)^\s*<!-- user-tab-colors-mod -->\r?\n?', ''
    $Content = $Content -replace '(?m)^\s*<link rel="stylesheet" href="user-tab-colors/tab-colors\.css" />\r?\n?', ''
    $Content = $Content -replace '(?m)^\s*<script src="user-tab-colors/tab-colors\.js"></script>\r?\n?', ''
    return $Content
}
