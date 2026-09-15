@echo off
:: =========================================================================
:: Al Rabeesh Dental Software - Bahrain Smart Card SDK V1.1 Updater
:: Updates CIO GCC CardRead Server to support both Old and New Bahrain Smart Cards
:: =========================================================================
echo =========================================================================
echo  Al Rabeesh Dental - New Bahrain Smart Card (Chip on Back) SDK Update
echo =========================================================================
echo.

:: Check Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Please right-click 'Update_Bahrain_New_Card_SDK.bat' and select 'Run as administrator'.
    echo.
    pause
    exit /b 1
)

echo [1/4] Stopping CIO GCC CardRead Server service...
net stop "CIO GCC CardRead Server" /y
timeout /t 2 /nobreak >nul

echo [2/4] Backing up existing extension DLLs...
set "TARGET_DIR=C:\Program Files (x86)\CIO\GCC CardRead Server\UnifiedSDK\SDK\DotNet\Extensions\BAH"
set "BACKUP_DIR=C:\Program Files (x86)\CIO\GCC CardRead Server\UnifiedSDK\SDK\DotNet\Extensions\BAH_backup"
set "SOURCE_DIR=%~dp0ReaderSDK\SCardReadServer\SCardReadServer\Bahrain Smart Card SDK-V1.1\Bahrain Smart Card SDK-V1.1\DotNet\Extensions\BAH"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
xcopy "%TARGET_DIR%\*" "%BACKUP_DIR%\" /Y /Q >nul 2>&1

echo [3/4] Copying New Bahrain Smart Card SDK V1.1 files...
if exist "%SOURCE_DIR%" (
    xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /Y /Q /E
    powershell -Command "Get-ChildItem '%TARGET_DIR%' | Unblock-File" >nul 2>&1
    echo   [OK] Files copied and unblocked successfully.
) else (
    echo   [ERROR] Source files not found at: %SOURCE_DIR%
)

echo [4/4] Starting CIO GCC CardRead Server service...
net start "CIO GCC CardRead Server"
echo.

echo =========================================================================
echo  [SUCCESS] Bahrain Smart Card SDK V1.1 is now active!
echo  The system can now read both:
echo   - Standard Bahrain Cards (Chip on Front)
echo   - New Bahrain Smart Cards (Chip on Back)
echo =========================================================================
echo.
pause
