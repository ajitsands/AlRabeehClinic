@echo off
:: =========================================================================
::  Al Rabeesh Dental - Bahrain Smart Card Bridge Launcher (Port 5050)
:: =========================================================================
title Al Rabeesh Dental - Bahrain CPR Smart Card Bridge 2025

:: Check for Administrative Privileges and self-elevate if necessary
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

color 0A
cls
echo =========================================================================
echo  Al Rabeesh Dental - Bahrain CPR Smart Card Reader Bridge (Port 5050)
echo  Supporting: 2025 New CPR Cards (Back Chip) and Old Cards (Front Chip)
echo =========================================================================
echo.

:: 1. Disable and Stop Conflicting SCardReadServer Service
echo [1/4] Disabling conflicting legacy Windows Service (SCardReadServer)...
sc config SCardReadServer start= disabled >nul 2>&1
net stop "CIO GCC CardRead Server" /y >nul 2>&1
net stop SCardReadServer /y >nul 2>&1

:: 2. Terminate any lingering processes locking Port 5050 or Smart Card Reader
echo [2/4] Releasing Port 5050 and USB Card Reader...
taskkill /F /IM SCardReadWebApi.exe >nul 2>&1
taskkill /F /IM BahrainCardBridge.exe >nul 2>&1
taskkill /F /IM eRevealer.Gcc.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 3. Configure Windows URL ACL Permissions for Port 5050
echo [3/4] Registering Port 5050 URL permissions...
netsh http add urlacl url=http://+:5050/ user=Everyone >nul 2>&1

:: 4. Start the Bridge on Port 5050
echo [4/4] Starting Al Rabeesh Bahrain Smart Card Bridge on Port 5050...
cd /d "%~dp0BahrainCardBridge"
start "Al Rabeesh Smart Card Bridge (Port 5050)" "%~dp0BahrainCardBridge\BahrainCardBridge.exe"

echo.
echo =========================================================================
echo  SUCCESS: Smart Card Bridge is now RUNNING on Port 5050!
echo  - Diagnostic Web Page: http://localhost:5050/
echo  - REST API: http://localhost:5050/api/operation/ReadCard
echo  You can now insert CPR card and click "Read Card" in Al Rabeesh Dental App.
echo =========================================================================
echo.
timeout /t 5
