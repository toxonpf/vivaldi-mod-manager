Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$managerUrl = 'http://127.0.0.1:43777'
$runtimeDir = Join-Path $PSScriptRoot 'web-manager\runtime'
$serverFile = Join-Path $PSScriptRoot 'web-manager\server.js'

function Test-Manager {
    try {
        Invoke-RestMethod -Uri "$managerUrl/api/status" -TimeoutSec 1 | Out-Null
        return $true
    } catch { return $false }
}

function Find-VivaldiExe {
    $candidates = @()
    if ($env:LOCALAPPDATA) {
        $candidates += Join-Path $env:LOCALAPPDATA 'Vivaldi\Application\vivaldi.exe'
    }
    if ($env:ProgramFiles) {
        $candidates += Join-Path $env:ProgramFiles 'Vivaldi\Application\vivaldi.exe'
    }
    if (${env:ProgramFiles(x86)}) {
        $candidates += Join-Path ${env:ProgramFiles(x86)} 'Vivaldi\Application\vivaldi.exe'
    }
    return $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

function Open-Manager {
    $vivaldi = Find-VivaldiExe
    if ($vivaldi) { Start-Process -FilePath $vivaldi -ArgumentList $managerUrl }
    else { Start-Process $managerUrl }
}

if (Test-Manager) {
    Write-Host 'Manager is already running. Opening a Vivaldi tab.'
    Open-Manager
    exit 0
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js is required. Install it from https://nodejs.org/' }

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$stdout = Join-Path $runtimeDir 'server.out.log'
$stderr = Join-Path $runtimeDir 'server.err.log'
$quotedServerFile = '"' + $serverFile + '"'
$process = Start-Process -FilePath $node.Source -ArgumentList @($quotedServerFile) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$process.Id | Set-Content (Join-Path $runtimeDir 'server.pid')

for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-Manager) {
        Write-Host 'Manager started. Opening a Vivaldi tab.'
        Open-Manager
        exit 0
    }
    Start-Sleep -Milliseconds 100
}

throw "Manager failed to start. Log: $stderr"
