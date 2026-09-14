# Quick Start & Deployment Guide

**Location:** `e:\Al Rabeesh Software\DevelopSupportFilesFolder\Quick_Start_and_Deployment.md`

---

## 1. Prerequisites

- **Node.js**: v18 or newer (v20+ recommended)
- **PHP**: v7.4 or v8.x with `pdo_mysql` enabled
- **MySQL**: v5.7 or v8.x / MariaDB
- **Operating System**: Windows 10/11 or Windows Server (for USB Smart Card reader compatibility)
- **Smart Card Driver**: `eRevealerSetup 5.4.0.4.exe` (included in `ReaderSDK`)

---

## 2. Running Frontend Locally (Development)

1. Open PowerShell or Command Prompt:
   ```powershell
   cd "e:\Al Rabeesh Software\dental-app"
   npm install
   npm run dev
   ```
2. Open `http://localhost:3000` in your web browser.

---

## 3. Building Frontend for Production

```powershell
cd "e:\Al Rabeesh Software\dental-app"
npm run build
```
The compiled static assets will be output to `e:\Al Rabeesh Software\dental-app\dist`.

---

## 4. Setting Up PHP Backend & MySQL Database

1. **Import MySQL Schema**:
   Open phpMyAdmin or MySQL CLI and run:
   ```powershell
   mysql -u root -p < "e:\Al Rabeesh Software\backend\schema.sql"
   ```
2. **Configure Database Credentials**:
   Edit `e:\Al Rabeesh Software\backend\config\database.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_PORT', '3306');
   define('DB_NAME', 'alrabeesh_dental');
   define('DB_USER', 'root');
   define('DB_PASS', '');
   ```
3. **Serve PHP API**:
   - Host the `e:\Al Rabeesh Software\backend` directory using Apache / Nginx / XAMPP / WampServer, or run PHP's built-in server:
     ```powershell
     cd "e:\Al Rabeesh Software\backend"
     php -S localhost:8000
     ```

---

## 5. Setting Up USB Smart Card Reader Daemon

1. Run the installer:
   `e:\Al Rabeesh Software\ReaderSDK\eRevealerSetup\eRevealerSetup 5.4.0.4.exe`
2. Connect your Omnikey / Identiv / ACS USB Smart Card reader.
3. Verify that the `CIO GCC CardRead Server` Windows service is active.
4. The web application will automatically communicate with `ws://localhost:5060/SCardRead`.
