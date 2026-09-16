# 🇧🇭 Bahrain Smart Card Reader Setup Guide (New PC Installation)
### Al Rabeesh Dental Center — Complete Deployment & Troubleshooting Manual

This guide explains how to set up the **Bahrain Smart Card Reader Service (Port 5050)** on any new computer (Reception desk, Doctor clinic room, or Dental branch PC).

Supports **both**:
- 🪪 **Standard Old Bahrain CPR Cards** (Gold chip on front)
- 💳 **New 2025/2026 Bahrain Smart Cards** (Gold chip on back — Card Version 6)

---

## 📦 1. Required Files & Software Prerequisites

### A. System Requirements
- **Operating System:** Windows 10 or Windows 11 (64-bit or 32-bit)
- **Framework:** Microsoft .NET Framework 4.5 or higher *(pre-installed on Windows 10/11)*
- **Hardware:** Standard USB Smart Card Reader (e.g., Alcor Micro, Rocketek, ACS ACR38/39, Identiv, Generic EMV)

### B. Files to Copy to the New PC
Copy the **`BahrainCardBridge`** folder and the launcher script from this repository to the new computer (e.g., to `C:\Al Rabeesh Software\BahrainCardBridge` or `D:\Al Rabeesh Software\BahrainCardBridge`):

```text
📁 BahrainCardBridge/
├── BahrainCardBridge.exe              # High-Speed 32-bit Card Bridge Server
├── BahrainCardBridge.exe.config       # Runtime and ATR Card Config
├── BH.CIO.Smartcard.IDCardManager.dll # Official CIO Smartcard Manager
├── BH.CIO.Smartcard.IDCardManager.dll.config
├── BH.CIO.Smartcard.Bahrain.dll       # Bahrain 2025/2026 Extension DLL
├── BH.CIO.Smartcard.Bahrain.Lookup.dll
├── BH.CIO.Smartcard.Data.dll
├── BH.CIO.Smartcard.Data.Lookup.dll
├── BH.CIO.Smartcard.Extension.dll
├── BH.CIO.Smartcard.PCSC.dll
├── BH.CIO.Smartcard.SharedLogger.dll
├── BerTlv.dll
├── pcsc-sharp.dll
├── pcsc-sharp.dll.config
├── netstandard.dll
├── Magick.NET-Q8-AnyCPU.dll
├── Magick.NET.Core.dll
├── Magick.Native-Q8-x86.dll
├── Magick.Native-Q8-x64.dll
├── log4net.dll
└── 📁 Extensions/
    ├── 📁 BAH/                        # Bahrain Card Definitions & Decoders
    ├── 📁 KSA/                        # Saudi Card Definitions
    ├── 📁 KWT/                        # Kuwait Card Definitions
    ├── 📁 OMN/                        # Oman Card Definitions
    ├── 📁 QAT/                        # Qatar Card Definitions
    └── 📁 UAE/                        # UAE Card Definitions

📄 Start_Bahrain_Card_Bridge.bat       # 1-Click Administrator Launcher
```

---

## ⚙️ 2. Step-by-Step Installation on a New PC

### Step 1: Plug in the USB Smart Card Reader
1. Plug the USB Smart Card Reader into any available USB port.
2. Windows will automatically install the standard CCID driver (`Microsoft Usbccid Smartcard Reader (WUDF)`).
3. Ensure the Windows **Smart Card** service is running:
   - Press `Win + R`, type `services.msc`, and press Enter.
   - Verify that **Smart Card** (`SCardSvr`) is set to **Automatic** and status is **Running**.

---

### Step 2: Grant Port 5050 URL Permissions (One-Time Setup)
To allow the local bridge to accept connections from web browsers without elevation warnings:
1. Open **Command Prompt as Administrator** (Right-click `cmd.exe` → *Run as administrator*).
2. Execute the following command:
   ```cmd
   netsh http add urlacl url=http://+:5050/ user=Everyone
   ```
   *(If prompted, "User=Everyone" guarantees all Windows users on that PC can run the reader).*

---

### Step 3: Launch the Smart Card Bridge
Double-click:
```cmd
Start_Bahrain_Card_Bridge.bat
```
*(Or right-click → **Run as administrator**).*

The console window will display:
```text
=========================================================================
  Al Rabeesh Dental Center - Bahrain CPR Smart Card Bridge 2026
  Supporting: Old CPR Cards (Front Chip) & New 2025/2026 (Back Chip)
  Port: 5050 | REST & HTML Diagnostics
=========================================================================

[Hardware] Connected USB Reader: Generic EMV Smartcard Reader 0
=========================================================================
 [READY] Smart Card Bridge is ACTIVE & LISTENING on Port 5050
 - REST API: http://localhost:5050/api/operation/ReadCard
 - Diagnostics: http://localhost:5050/
 - Health Check: http://localhost:5050/status
=========================================================================
```

---

## 🧪 3. Verification & Live Testing

### Method 1: Instant Browser Diagnostics Page
1. Open your browser and navigate to:
   👉 **[http://localhost:5050/](http://localhost:5050/)**
2. You will see the live hardware diagnostics screen showing:
   - **Bridge Service Status:** `● ACTIVE (Port 5050)`
   - **USB Smart Card Reader:** `Generic EMV Smartcard Reader 0` (or reader name)
   - **CPR Card Insertion:** `Card Inserted` / `No Card in Reader`
3. Click **"💳 Read CPR Smart Card Now"** to verify data extraction (CPR number, English & Arabic names, DOB, address, and photo).

### Method 2: Official SDK Sample (`RESTfull.html`)
Open:
```text
file:///E:/Al%20Rabeesh%20Software/ReaderSDK/Samples/RESTfull.html
```
Click **"Read Smartcard"** — all data fields will instantly populate the table.

### Method 3: Al Rabeesh Dental Application
1. Open the clinic app at `http://localhost:3000` or `https://alrabeesh.sandslab.com`.
2. Click **"Read CPR"** in the top navigation bar or inside the **Patient Registry / Booking Modal**.
3. All fields (CPR, Full Name, DOB, Gender, Phone, Flat, Building, Road, Block, Photo) will auto-fill automatically.

---

## 🚀 4. How to Make the Card Bridge Auto-Start on Windows Boot

To make sure clinic receptionists never have to manually launch the bridge every morning:

### Option A: Windows Startup Folder (Recommended & Simplest)
1. Press `Win + R`, type:
   ```cmd
   shell:startup
   ```
   and press Enter. This opens your `Startup` folder.
2. Right-click inside the folder → **New** → **Shortcut**.
3. Set the target to:
   ```cmd
   "C:\Al Rabeesh Software\Start_Bahrain_Card_Bridge.bat"
   ```
4. Name the shortcut: **Al Rabeesh Smart Card Bridge**.

Every time the computer boots or a receptionist logs in, the card bridge will start automatically in the background.

---

### Option B: Windows Task Scheduler (Runs Silently in Background)
1. Open **Task Scheduler** (`taskschd.msc`).
2. Click **Create Task** (Name: `AlRabeeshCardBridge`).
3. Check **"Run with highest privileges"**.
4. Under **Triggers** tab → Click **New** → Select **At log on**.
5. Under **Actions** tab → Click **New**:
   - **Program/script:** `C:\Al Rabeesh Software\BahrainCardBridge\BahrainCardBridge.exe`
   - **Start in:** `C:\Al Rabeesh Software\BahrainCardBridge`
6. Click **OK**.

---

## 🛠️ 5. Troubleshooting & FAQ

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **"No smart card reader detected"** | USB reader is unplugged or driver not ready | Unplug the USB reader, wait 3 seconds, plug it into a direct motherboard USB port. Check Device Manager under `Smart card readers`. |
| **"The smart card has been removed..."** | Card not inserted firmly or wrong orientation | Push the card **all the way in** until it stops. For **Old Cards**: Gold chip faces **UP**. For **New Cards (Chip on back)**: Flip card so gold chip touches contact pins. |
| **"HTTP Error 503 / Service Unavailable"** | Stale Windows service or port conflict | Run `Start_Bahrain_Card_Bridge.bat` (which automatically closes conflicting legacy services and starts the bridge). |
| **Card read takes 5+ seconds** | First initialization of PCSC context | Normal on first scan after boot; subsequent reads execute in under 1 second. |

---

*Al Rabeesh Dental Center — Smart Card Hardware Integration Documentation — September 2026*
