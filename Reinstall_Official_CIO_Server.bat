@echo off
:: =========================================================================
::  Al Rabeesh Dental - Reinstall Clean Official CIO Smart Card Service
:: =========================================================================
title Reinstall Clean Official CIO Smart Card Service

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

color 0E
cls
echo =========================================================================
echo  Al Rabeesh Dental - Reinstall Clean Official CIO Smart Card Service
echo =========================================================================
echo.

echo [1/3] Stopping any running card processes...
net stop "CIO GCC CardRead Server" /y >nul 2>&1
net stop SCardReadServer /y >nul 2>&1
taskkill /F /IM SCardReadWebApi.exe >nul 2>&1
taskkill /F /IM BahrainCardBridge.exe >nul 2>&1
taskkill /F /IM eRevealer.Gcc.exe >nul 2>&1

echo [2/3] Launching official SCardReadServer Installer...
echo Please click "Next" / "Install" / "Finish" in the setup wizard that appears.
echo.
cd /d "%~dp0ReaderSDK\SCardReadServer\SCardReadServer"
start /wait SCardReadServer.exe

echo [3/3] Starting CIO GCC CardRead Server...
sc config SCardReadServer start= auto >nul 2>&1
net start SCardReadServer /y >nul 2>&1
net start "CIO GCC CardRead Server" /y >nul 2>&1

echo.
echo =========================================================================
echo  INSTALLATION COMPLETE: Official CIO Smart Card Server is now READY!
echo =========================================================================
echo.
timeout /t 5
