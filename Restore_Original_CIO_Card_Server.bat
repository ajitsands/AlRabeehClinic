@echo off
:: =========================================================================
::  Al Rabeesh Dental - Restore Original Official CIO Smart Card Server (x86)
:: =========================================================================
title Restore Original CIO Smart Card Server

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

color 0A
cls
echo =========================================================================
echo  Al Rabeesh Dental - Restoring Official CIO SCardReadServer
echo =========================================================================
echo.

echo [1/4] Stopping Card Reader services...
net stop "CIO GCC CardRead Server" /y >nul 2>&1
net stop SCardReadServer /y >nul 2>&1
taskkill /F /IM SCardReadWebApi.exe >nul 2>&1
taskkill /F /IM BahrainCardBridge.exe >nul 2>&1
taskkill /F /IM eRevealer.Gcc.exe >nul 2>&1

echo [2/4] Restoring original 32-bit Core & Server DLLs...
if exist "C:\Program Files (x86)\CIO\Backup_CardServer_Old" (
    copy /Y "C:\Program Files (x86)\CIO\Backup_CardServer_Old\*.*" "C:\Program Files (x86)\CIO\GCC CardRead Server\" >nul
)

echo [3/4] Restoring original 32-bit Bahrain Extension DLLs...
if exist "C:\Program Files (x86)\CIO\Backup_BAH_Old" (
    if not exist "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH" mkdir "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH"
    copy /Y "C:\Program Files (x86)\CIO\Backup_BAH_Old\*.*" "C:\Program Files (x86)\CIO\GCC CardRead Server\Extensions\BAH\" >nul
)

echo [4/4] Starting CIO GCC CardRead Server...
sc config SCardReadServer start= auto >nul 2>&1
net start SCardReadServer /y >nul 2>&1
net start "CIO GCC CardRead Server" /y >nul 2>&1

echo.
echo =========================================================================
echo  SUCCESS: Original CIO SCardReadServer restored and RUNNING!
echo  WebSocket: ws://localhost:5060/SCardRead (Port 5060)
echo  REST API:  http://localhost:5050/api/operation/ReadCard (Port 5050)
echo =========================================================================
echo.
timeout /t 5
