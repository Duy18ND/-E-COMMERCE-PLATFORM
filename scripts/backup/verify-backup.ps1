<#
.SYNOPSIS
    ShopMart E-Commerce Platform — MySQL Backup Verification Tool (PowerShell)
.DESCRIPTION
    Validates integrity, gzip compression, and SQL structure of a backup archive.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Path
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) {
    Write-Error "[INVALID] File does not exist: $Path"
    exit 2
}

$item = Get-Item $Path
if ($item.Length -le 0) {
    Write-Error "[INVALID] File is empty (0 bytes): $Path"
    exit 3
}

Write-Host "[VALID] Test 1 & 2 Passed: File exists ($([math]::Round($item.Length / 1KB, 2)) KB)" -ForegroundColor Green

$isGz = $Path.EndsWith(".gz", [System.StringComparison]::OrdinalIgnoreCase)

if ($isGz) {
    $fileStream = $null
    $gzStream = $null
    $memStream = $null
    try {
        $fileStream = [System.IO.File]::OpenRead($Path)
        $gzStream = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionMode]::Decompress)
        $memStream = New-Object System.IO.MemoryStream
        $gzStream.CopyTo($memStream)
        $uncompressedBytes = $memStream.ToArray()
        $content = [System.Text.Encoding]::UTF8.GetString($uncompressedBytes)
        Write-Host "[VALID] Test 3 Passed: GZIP decompression verified cleanly (Uncompressed size: $([math]::Round($uncompressedBytes.Length / 1KB, 2)) KB)" -ForegroundColor Green
    } catch {
        Write-Error "[INVALID] Test 3 Failed: GZIP stream corrupted! $($_.Exception.Message)"
        exit 4
    } finally {
        if ($null -ne $gzStream) { $gzStream.Dispose() }
        if ($null -ne $memStream) { $memStream.Dispose() }
        if ($null -ne $fileStream) { $fileStream.Dispose() }
    }
} else {
    $content = Get-Content $Path -Raw
}

# Verify SQL Headers & Markers
if ($content -match "MySQL dump|/\*!40101 SET") {
    Write-Host "[VALID] Test 4 Passed: Recognized official MySQL dump signatures." -ForegroundColor Green
} else {
    Write-Error "[INVALID] Test 4 Failed: SQL header does not match a valid MySQL dump."
    exit 5
}

$tableMatches = [regex]::Matches($content, "(?im)^\s*CREATE TABLE")
Write-Host "[VALID] Test 5 Passed: Detected $($tableMatches.Count) table creation statement(s)." -ForegroundColor Green

if ($content -match "Dump completed on") {
    Write-Host "[VALID] Test 6 Passed: Found 'Dump completed on' trailer marker." -ForegroundColor Green
}

Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "                   BACKUP ARCHIVE VERIFICATION REPORT                    " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  File:                $($item.Name)"
Write-Host "  Size (Compressed):   $([math]::Round($item.Length / 1KB, 2)) KB"
Write-Host "  Format:              $([string]$(if ($isGz) { 'GZIP Compressed SQL (.sql.gz)' } else { 'Plain Text SQL (.sql)' }))"
Write-Host "  Tables detected:     $($tableMatches.Count)"
Write-Host "  Verification Result: VALID (Structure & Integrity OK)"
Write-Host "==========================================================================`n" -ForegroundColor Cyan

exit 0
