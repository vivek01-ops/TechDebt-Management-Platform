#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Error: docker is not installed or not in PATH."
    exit 1
}

$composeCmd = $null
try {
    docker compose version *> $null
    if ($LASTEXITCODE -eq 0) { $composeCmd = @("docker", "compose") }
} catch {}

if (-not $composeCmd) {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $composeCmd = @("docker-compose")
    } else {
        Write-Error "Error: Docker Compose is not available (need 'docker compose' or 'docker-compose')."
        exit 1
    }
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

Write-Host "Starting TechDebt Management Platform (Docker Compose)..."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8000 (health: /health, docs: /docs)"
Write-Host ""

if ($composeCmd.Count -eq 2) {
    & $composeCmd[0] $composeCmd[1] up --build @args
} else {
    & $composeCmd[0] up --build @args
}
exit $LASTEXITCODE
