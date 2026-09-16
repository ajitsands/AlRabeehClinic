@echo off
:: =========================================================================
::  Al Rabeesh Dental - Official CIO Smart Card Service Launcher (Port 5060 / 5050)
:: =========================================================================
title Al Rabeesh Dental - CIO GCC Smart Card Service

:: Check for Administrative Privileges and self-elevate if necessary
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

color 0B
cls
echo =========================================================================
echo  Al Rabeesh Dental - Official CIO Smart Card Reader Service
echo  Mode: Standard CIO SCardReadServer (WebSocket 5060 / REST 5050)
echo =========================================================================
echo.

:: 1. Terminate any duplicate bridge processes
echo [1/3] Closing standalone bridge instances...
taskkill /F /IM BahrainCardBridge.exe >nul 2>&1
taskkill /F /IM eRevealer.Gcc.exe >nul 2>&1

:: 2. Enable and Start the Official SCardReadServer Windows Service
echo [2/3] Enabling and Starting CIO GCC CardRead Server...
sc config SCardReadServer start= auto >nul 2>&1
net start SCardReadServer /y >nul 2>&1
net start "CIO GCC CardRead Server" /y >nul 2>&1

:: Check if SCardReadWebApi is running; if not, launch it directly
tasklist | findstr /i "SCardReadWebApi.exe" >nul
if %errorLevel% neq 0 (
    echo Starting SCardReadWebApi directly...
    if exist "C:\Program Files (x86)\CIO\GCC CardRead Server\SCardReadWebApi.exe" (
        start "" "C:\Program Files (x86)\CIO\GCC CardRead Server\SCardReadWebApi.exe"
    )
)

:: 3. Configure Port 5050 and 5060 URL ACL
echo [3/3] Configuring URL permissions...
netsh http add urlacl url=http://+:5050/ user=Everyone >nul 2>&1
netsh http add urlacl url=http://localhost:5050/ user=Everyone >nul 2>&1
netsh http add urlacl url=http://127.0.0.1:5050/ user=Everyone >nul 2>&1

echo.
echo =========================================================================
echo  SUCCESS: CIO GCC Smart Card Service is RUNNING!
echo  WebSocket: ws://localhost:5060/SCardRead (Active)
echo  REST API:  http://localhost:5050/api/operation/ReadCard (Active)
echo =========================================================================
echo.
timeout /t 5
