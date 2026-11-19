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

Write-Host "Pulling Docker images..."
& $composeCmd[0] "compose" "pull" 2>$null || Write-Host "Note: docker compose pull completed (some services may use build)."

Write-Host "Starting containers..."
if ($composeCmd.Count -eq 2) {
    & $composeCmd[0] $composeCmd[1] up @args
} else {
    & $composeCmd[0] up @args
}
exit $LASTEXITCODE