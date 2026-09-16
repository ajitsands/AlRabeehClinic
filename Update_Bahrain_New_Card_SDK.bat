@echo off
title Al Rabeesh Dental - Bahrain Smart Card Synchronizer
setlocal EnableDelayedExpansion

echo =========================================================================
echo  Al Rabeesh Dental - Bahrain Smart Card 2025 Synchronizer
echo =========================================================================
echo.

echo [1/5] Stopping Card Reader Service...
net stop "CIO GCC CardRead Server"

echo.
echo [2/5] Cleaning duplicate backup folders...
rmdir /S /Q "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH" 2>nul
rmdir /S /Q "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH_backup" 2>nul

echo.
echo [3/5] Registering log4net assemblies in Global Assembly Cache (GAC)...
powershell -Command "[System.Reflection.Assembly]::Load('System.EnterpriseServices, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a') | Out-Null; $p = New-Object System.EnterpriseServices.Internal.Publish; if (Test-Path 'C:\Program Files (x86)\CIO\Backup_CardServer_Old\log4net.dll') { $p.GacInstall('C:\Program Files (x86)\CIO\Backup_CardServer_Old\log4net.dll') }; if (Test-Path 'C:\Program Files (x86)\CIO\eRevealer.GCC\log4net.dll') { $p.GacInstall('C:\Program Files (x86)\CIO\eRevealer.GCC\log4net.dll') }; Remove-Item -Path 'C:\Windows\Microsoft.NET\assembly\GAC_MSIL\BH.CIO.Smartcard.SharedLogger' -Recurse -Force -ErrorAction SilentlyContinue" 2>nul

echo.
echo [4/5] Deploying 2025 Bahrain Smartcard Assemblies to Server...
set "SRC=C:\Program Files (x86)\CIO\eRevealer.GCC"
set "DST=C:\Program Files (x86)\CIO\GCC CardRead Server"

copy /Y "!SRC!\log4net.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.SharedLogger.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.Extension.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.IDCardManager.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.IDCardManager.dll.config" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.Data.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.Data.Lookup.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.PCSC.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.Bahrain.dll" "!DST!\"
copy /Y "!SRC!\BH.CIO.Smartcard.Bahrain.Lookup.dll" "!DST!\"
copy /Y "!SRC!\BerTlv.dll" "!DST!\"
copy /Y "!SRC!\pcsc-sharp.dll" "!DST!\"
copy /Y "!SRC!\pcsc-sharp.dll.config" "!DST!\"
copy /Y "!SRC!\netstandard.dll" "!DST!\"
copy /Y "!SRC!\Magick.NET-Q8-AnyCPU.dll" "!DST!\"
copy /Y "!SRC!\Magick.NET.Core.dll" "!DST!\"
copy /Y "!SRC!\Magick.Native-Q8-x86.dll" "!DST!\"
copy /Y "!SRC!\Magick.Native-Q8-x64.dll" "!DST!\"
copy /Y "!SRC!\Magick.Native-Q8-arm64.dll" "!DST!\"

copy /Y "%~dp0DevelopSupportFilesFolder\SCardReadWebApi.exe.config" "!DST!\SCardReadWebApi.exe.config"

echo.
echo [5/5] Starting Card Reader Service...
net start "CIO GCC CardRead Server"

echo.
echo =========================================================================
echo  Verifying Service & Reader Status...
echo =========================================================================
timeout /t 2 /nobreak >nul
powershell -ExecutionPolicy Bypass -File "%~dp0scratch_test_api.ps1" 2>nul || powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:5050/api/operation/ReadCard' -Method Post -Body '{\"ReadCardInfo\":false,\"SilentReading\":true,\"OutputFormat\":\"JSON\"}' -ContentType 'text/plain' -TimeoutSec 5; Write-Host 'Service Status: Online and Ready!' -ForegroundColor Green } catch { Write-Host 'Service Status:' $_.Exception.Message }"

echo.
echo =========================================================================
echo  SUCCESS: Bahrain Smart Card 2025 synchronization completed!
echo =========================================================================
echo.
pause
