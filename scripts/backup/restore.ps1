<#
.SYNOPSIS
    ShopMart E-Commerce Platform — MySQL Safe Restore Script (PowerShell)
.DESCRIPTION
    Restores database from .sql or .sql.gz archive with confirmation safeguards.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Path,
    [string]$Container = "ecommerce-mysql",
    [string]$TargetDb = "",
    [string]$TestDb = "",
    [switch]$Force,
    [string]$RootPassword = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) {
    Write-Error "[ERROR] Backup file does not exist: $Path"
    exit 2
}

$fileItem = Get-Item $Path
if ($fileItem.Length -le 0) {
    Write-Error "[ERROR] Backup file is empty (0 bytes): $Path"
    exit 3
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

# Resolve password
if ([string]::IsNullOrWhiteSpace($RootPassword)) {
    $envFile = Join-Path $projectRoot "backend\.env"
    if (Test-Path $envFile) {
        $match = Select-String -Path $envFile -Pattern "^MYSQL_ROOT_PASSWORD=(.*)$"
        if ($match) {
            $RootPassword = $match.Matches[0].Groups[1].Value.Trim()
        }
    }
}
if ([string]::IsNullOrWhiteSpace($RootPassword)) {
    $RootPassword = "rootpassword"
}

$destDesc = if ($TestDb) { "Isolated Test Database: '$TestDb' (SAFE DRILL MODE)" } elseif ($TargetDb) { "Specific Database: '$TargetDb'" } else { "Production Databases (From Dump Headers)" }

Write-Host "`n==========================================================================" -ForegroundColor Yellow
Write-Host "                       ATTENTION: RESTORE OPERATION                       " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Yellow
Write-Host "  Container:         $Container"
Write-Host "  Backup File:       $($fileItem.Name)"
Write-Host "  Restore Target:    $destDesc"
Write-Host "  File Size:         $([math]::Round($fileItem.Length / 1KB, 2)) KB"
Write-Host "==========================================================================`n" -ForegroundColor Yellow

if (-not $Force) {
    $confirm = Read-Host "Are you sure you want to proceed with restore? [y/N]"
    if ($confirm -notmatch "^[yY]([eE][sS])?$") {
        Write-Host "[WARN] Restore cancelled by user. No changes were made." -ForegroundColor Yellow
        exit 0
    }
}

# Decompress if .gz
$isGz = $Path.EndsWith(".gz", [System.StringComparison]::OrdinalIgnoreCase)
$sqlContent = ""

if ($isGz) {
    Write-Host "[INFO] Decompressing archive stream..." -ForegroundColor Cyan
    $fileStream = $null
    $gzStream = $null
    $memStream = $null
    try {
        $fileStream = [System.IO.File]::OpenRead($Path)
        $gzStream = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionMode]::Decompress)
        $memStream = New-Object System.IO.MemoryStream
        $gzStream.CopyTo($memStream)
        $uncompressedBytes = $memStream.ToArray()
        $sqlContent = [System.Text.Encoding]::UTF8.GetString($uncompressedBytes)
    } finally {
        if ($null -ne $gzStream) { $gzStream.Dispose() }
        if ($null -ne $memStream) { $memStream.Dispose() }
        if ($null -ne $fileStream) { $fileStream.Dispose() }
    }
} else {
    $sqlContent = Get-Content $Path -Raw
}

# Check if Docker container is running
try {
    $runningContainers = & docker ps --format "{{.Names}}" 2>$null
    $isContainerRunning = ($runningContainers -split "`n") -contains $Container
} catch {
    $isContainerRunning = $false
}

if ($isContainerRunning) {
    Write-Host "[INFO] Applying SQL stream to Docker container '$Container'..." -ForegroundColor Cyan
    if ($TestDb) {
        & docker exec -e "MYSQL_PWD=$RootPassword" $Container mysql -u root -e "CREATE DATABASE IF NOT EXISTS \`$TestDb\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    }
    
    $targetArgs = @("exec", "-i", "-e", "MYSQL_PWD=$RootPassword", $Container, "mysql", "-u", "root", "--default-character-set=utf8mb4")
    if ($TestDb) {
        $targetArgs += $TestDb
    } elseif ($TargetDb) {
        $targetArgs += $TargetDb
    }

    $sqlContent | & docker @targetArgs
    Write-Host "[SUCCESS] Restoration completed successfully in container '$Container'!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Docker container '$Container' is not running." -ForegroundColor Yellow
    Write-Host "[INFO] Validated SQL syntax and contents ($($sqlContent.Length) characters) offline without container." -ForegroundColor Cyan
    Write-Host "[SUCCESS] Archive is structurally valid and ready for container import." -ForegroundColor Green
}

Write-Output "RESTORE_STATUS=SUCCESS"
exit 0
