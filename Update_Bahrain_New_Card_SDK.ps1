# =========================================================================
# Al Rabeesh Dental Software - Bahrain Smart Card SDK 2025 Synchronizer
# Updates CIO GCC CardRead Server to support both Old and New Bahrain Smart Cards
# =========================================================================

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host " Al Rabeesh Dental - Bahrain Smart Card 2025 Synchronizer" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""

# Check and Self-Elevate to Administrator if needed
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}


Write-Host "[1/5] Stopping CIO GCC CardRead Server service..." -ForegroundColor Yellow
try {
    Stop-Service -Name "SCardReadServer" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Service stopped." -ForegroundColor Green
} catch {
    Write-Host "  [NOTICE] Service stop notice: $_" -ForegroundColor Gray
}

$srcRoot = "C:\Program Files (x86)\CIO\eRevealer.GCC"
$srcBah = "C:\Program Files (x86)\CIO\eRevealer.GCC\Extensions\BAH"
$serverRoot = "C:\Program Files (x86)\CIO\GCC CardRead Server"
$serverBah = "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH"
$backupDir = "C:\Program Files (x86)\CIO\Backup_CardServer_Old"

Write-Host "[2/5] Cleaning duplicate backup folders inside Extensions..." -ForegroundColor Yellow
$internalBackup = "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH_backup"
if (Test-Path $internalBackup) {
    Remove-Item -Path $internalBackup -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Removed duplicate internal backup folder." -ForegroundColor Green
}

Write-Host "[3/5] Backing up old server files to: $backupDir" -ForegroundColor Yellow
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
Copy-Item -Path "$serverRoot\*.dll" -Destination $backupDir -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] Backup completed." -ForegroundColor Green

Write-Host "[4/5] Copying New 2025 Core Libraries and Bahrain Extension..." -ForegroundColor Yellow
if (Test-Path $srcRoot) {
    # Copy core binaries to root server folder
    $coreFiles = @(
        "$srcRoot\BH.CIO.*.dll",
        "$srcRoot\BerTlv.dll",
        "$srcRoot\Magick*.dll",
        "$srcRoot\netstandard.dll",
        "$srcRoot\pcsc-sharp.dll",
        "$srcRoot\BH.CIO.Smartcard.IDCardManager.dll.config"
    )

    foreach ($filePattern in $coreFiles) {
        Copy-Item -Path $filePattern -Destination $serverRoot -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  [OK] Core Data, Manager, BerTlv & Image decoders copied to root server." -ForegroundColor Green

    # Copy extension files to Extensions\BAH
    if (-not (Test-Path $serverBah)) {
        New-Item -ItemType Directory -Path $serverBah -Force | Out-Null
    }
    Copy-Item -Path "$srcBah\*" -Destination $serverBah -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] 2025 Bahrain Extension DLLs copied to Extensions\BAH." -ForegroundColor Green

    # Also update UnifiedSDK if present
    $unifiedBah = "C:\Program Files (x86)\CIO\GCC CardRead Server\UnifiedSDK\SDK\DotNet\Extensions\BAH"
    if (Test-Path "C:\Program Files (x86)\CIO\GCC CardRead Server\UnifiedSDK") {
        if (-not (Test-Path $unifiedBah)) {
            New-Item -ItemType Directory -Path $unifiedBah -Force | Out-Null
        }
        Copy-Item -Path "$srcBah\*" -Destination $unifiedBah -Recurse -Force -ErrorAction SilentlyContinue
    }

    # Unblock all files
    Get-ChildItem -Path $serverRoot -Recurse | Unblock-File -ErrorAction SilentlyContinue
    Write-Host "  [OK] All files unblocked successfully." -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Source eRevealer folder not found at: $srcRoot" -ForegroundColor Red
}

Write-Host "[5/5] Starting CIO GCC CardRead Server service..." -ForegroundColor Yellow
try {
    Start-Service -Name "SCardReadServer" -ErrorAction Stop
    Write-Host "  [OK] Service started successfully." -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Could not start service: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Green
Write-Host " [SUCCESS] CIO CardRead Server is fully updated and running!" -ForegroundColor Green
Write-Host " The dental software can now read:" -ForegroundColor Green
Write-Host "  - Standard Old Bahrain CPR Cards (Chip on Front)" -ForegroundColor Green
Write-Host "  - New Bahrain Smart Cards (Chip on Back - Card Version 6)" -ForegroundColor Green
Write-Host "=========================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"

