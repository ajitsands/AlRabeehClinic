# Al Rabeesh Dental Software — Walkthrough & User Guide

**Location:** `e:\Al Rabeesh Software\DevelopSupportFilesFolder\Walkthrough.md`

---

## 🌟 Key Highlights & System Overview

The **Al Rabeesh Dental Specialty Center Software** is a specialized, offline-first clinical practice management system tailored for the Kingdom of Bahrain and GCC healthcare practices.

### 1. 💳 National Smart Card Reader (Bahrain & GCC Integration)
- **Local Daemon Bridge**: Directly connects to the background Windows service **`CIO GCC CardRead Server` (`SCardReadWebApi.exe`)** on `ws://localhost:5060/SCardRead` and REST API endpoints.
- **One-Click Patient Intake**: Reads CPR Number, English Full Name, Arabic Full Name, Date of Birth, Gender, Nationality, Address, and Base64 Cardholder Photo.
- **Interactive Simulator**: Includes realistic Bahrain & GCC sample smart cards for testing when a physical USB reader or card is not plugged in.

### 2. 📅 Single-Window Multi-Doctor Calendar & Dynamic Multi-Slot Booking
- **Simultaneous Single-Screen View**: All 5+ clinic doctors are displayed side-by-side in dedicated columns with photos, specialties, and assigned dental chairs.
- **Configurable Operating Timings**: Supports customized clinic hours (e.g. 09:00 to 17:30) with 30-minute intervals.
- **Strict Break Time Scheduler**: Blocks appointments during clinic lunch & prayer breaks (e.g. 13:00 to 14:00) with diagonal striped break banners.
- **Dynamic Slot Duration Engine**:
  - **1 Slot (30 mins)**: Routine Consultations, Scaling & Cleaning, Follow-ups
  - **2 Slots (1 Hour)**: Root Canal Treatment (RCT), Surgical Extractions, Teeth Whitening, Crowns
  - **3 Slots (1.5 Hours)**: Dental Implants, Complex Oral Surgeries
- **Status Workflow**: `Scheduled` ➔ `Confirmed` ➔ `Checked-In (Waiting)` ➔ `In Dental Chair` ➔ `Completed` / `Cancelled`.

### 3. 👥 Patient File Registry & Fast Search
- **Instant Search**: Lookup patients by **Mobile Number, Name (Arabic/English), CPR/Card Number, or Patient File ID (`PAT-2026-XXXX`)**.
- **4 Cards Per Row Grid**: Clean responsive layout displaying 4 patient profile cards in one row on desktop displays.
- **Auto File ID Generator**: Automatically issues sequential file numbers (`PAT-2026-0001`, `PAT-2026-0002`...).

### 4. 🩺 Clinical Vitals Tracker & File Attachments (Up to 100MB)
- **Vitals Logger**: Blood Pressure (Systolic/Diastolic), Pulse (bpm), Temperature (°C), SpO2 Oxygen (%), Blood Sugar (mg/dL), Weight (kg), and Visual Dental Pain Scale (0–10).
- **Large Attachment Manager**: Supports uploading and previewing **Dental Panoramic X-Rays (OPG), Intraoral Photos, CBCT Scans, Lab reports, and Prescriptions up to 100 MB** per file with high-res modal previews and downloads.

### 5. 👨‍⚕️ Doctors & Dental Services Catalog (4 Cards per Row)
- **Doctors & Chairs**: Configure doctor profiles, chair assignments, room numbers, color tags, and active status in a 4-cards-per-row grid.
- **Services Catalog**: Configure procedure durations, required slot counts, categories, and fees in a 4-cards-per-row grid.

### 6. ⚙️ Regional Localization (Gulf & India) & Theming
- **Theme**: Default **Light Theme** with instant switch to **Dark Theme**.
- **Currencies**:
  - **Bahrain Dinar (BHD)**: `BD 25.000` (3 decimals by default)
  - **Kuwait Dinar (KWD)**: `KD 25.000` (3 decimals)
  - **Omani Rial (OMR)**: `OMR 25.000` (3 decimals)
  - **Saudi Riyal (SAR)**: `SAR 25.00` (2 decimals)
  - **UAE Dirham (AED)**: `AED 25.00` (2 decimals)
  - **Indian Rupee (INR)**: `₹ 500.00` (2 decimals)
- **Time Zones**: `Asia/Bahrain` (GMT+3), `Asia/Riyadh`, `Asia/Dubai`, `Asia/Kolkata` (IST).
- **Date Formats**: `DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`.

### 7. 📴 Offline-First Engine (IndexedDB + PHP & MySQL Sync)
- **Zero Internet Interruption**: The entire system operates smoothly using local IndexedDB (`Dexie.js`) when internet connectivity is disconnected.
- **Outbox Sync Queue**: All offline operations (`INSERT`, `UPDATE`, `DELETE`) are queued and automatically batch-synchronized with the **PHP API & MySQL database** when the internet is reconnected.

### 8. 🏢 SaNDS Lab Middle East W.L.L Interactive Modal
- Built-in interactive footer trigger that displays the official SaNDS Lab company card, logo, contact coordinates (+973 35078079), product catalog link, and WhatsApp direct chat.

---

## 🚀 How to Run and Use the Software

### 1. Access the Application
- Open any web browser and navigate to:
  👉 **`http://localhost:3000`**

### 2. Daily Workflow Guide
1. **Scan Smart Card & Register Patient**:
   - In the top navigation bar, click **"Scan Smart Card"** (or use the dropdown test presets).
   - Review the pre-filled CPR, Arabic/English Names, DOB, Address, and Photo.
   - Click **"Register & Create Patient File"** to generate the permanent file ID.
2. **Schedule Appointment**:
   - Open **"Doctor Schedule & Calendar"**.
   - Select the desired doctor and click an available time slot.
   - Select the patient and treatment. Confirm the booking.
3. **Log Vitals & Attach X-Rays**:
   - Open **"Vitals & Clinical X-Rays"**.
   - Record blood pressure, pulse, pain scale, and upload dental OPG X-Rays / CBCT scans up to 100MB.
4. **Customize Operating Hours & Break Time**:
   - Open **"Settings & Localization"**.
   - Configure opening time (e.g. `09:00`), closing time (e.g. `17:30`), and lunch/prayer break (e.g. `13:00` to `14:00`).
   - Click **"Save All Settings"**.
