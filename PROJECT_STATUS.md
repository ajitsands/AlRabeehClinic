# 🏥 Al Rabeesh Dental Center — Project Status & Handover Note

**Date / Timestamp:** September 15, 2026  
**Repository:** `https://github.com/ajitsands/AlRabeehClinic.git` (Branch: `main`)  
**Production URL:** `https://alrabeesh.sandslab.com`  
**Local Development:** `http://localhost:3000` (Vite + React)  

---

## 📋 1. What Has Been Completed & Verified

### ✅ A. Navigation & Visual Hierarchy
- **Two-Tier Header Structure**: 
  - Upper bar: Clinic branding, Smart Card quick scanner, role switcher (`ADMIN`, `DOCTOR`, `RECEPTIONIST`), theme toggle (`Dark/Light`), and connection sync badge.
  - Lower navigation bar: Differentiated contrast background (`bg-slate-100` / dark: `bg-slate-950`) with card-styled tabs and active gradient highlights.
- **Global Hand Pointer (`cursor: pointer !important`)**: Enforced across all buttons, dropdowns, links, and actionable cards.
- **SaNDS Lab Info Modal**: Interactive footer modal containing company profile, GPS coordinates, WhatsApp direct link (+973 35078079), product portfolio, and website link.

### ✅ B. Multi-Doctor Single-Window Calendar Matrix
- **Side-by-Side Doctor Columns**: Full matrix view showing all 5 clinic doctors with color-coded specialties and designated dental chairs.
- **Dynamic Slot System**: 30 min, 60 min, and 90 min procedure slots with live hover timings.
- **Clinic Lunch & Prayer Break Protection**: Strict 13:00 – 14:00 timeblock protection preventing double-booking or scheduling during breaks.
- **Drag & Drop Rescheduling**: Grab any appointment card and drop it onto any doctor's time slot on the calendar grid with real-time collision checks, break-time protection, and immediate background sync.
- **Dedicated Reschedule Modal (Different Date / Time / Doctor)**:
  - 1-click access via direct card icon or appointment details window.
  - Quick-pick date jumps (`Today`, `Tomorrow`, `+2 Days`, `Next Week`) + full calendar date selector.
  - Doctor reassignment, time-slot picker with live collision validation, and slot duration adjustments.
- **Real-Time Big & Bold Status Count Badges**:
  - `● Confirmed [Count]`
  - `● Checked-In [Count]`
  - `● In Dental Chair [Count]`
  - `● Completed [Count]`

### ✅ C. Bahrain & GCC Smart Card Integration
- **Direct USB Card Reader Integration**: WebSockets hook connecting to local `SCardReadServer.exe` on `ws://127.0.0.1:8080`.
- **National CPR Card Data Extraction**: Auto-fills CPR Number, Full English Name, Full Arabic Name, Date of Birth, Gender, Nationality, Address, and CPR Photo Base64.
- **Built-in Smart Card Simulator**: Fallback testing options with 3 Bahraini/GCC test identity presets.
- **Settings Driver Center**: Direct one-click **"Download Now"** buttons for `eRevealerSetup 5.4.0.4.exe` (50.6MB) and `SCardReadServer.exe` (6.1MB), with copy-path utilities and live connection diagnostics.

### ✅ D. Patient & Doctor Directories
- **4 Cards per Row Grid Layout**: Enforced on Patient Registry, Doctors Directory, and Dental Services catalog (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- **Prominent Patient File Number Badges**: Extra-bold `PAT-2026-XXXX` badges across patient cards and directories.
- **Select2-Style Searchable Patient Dropdown (`SearchablePatientSelect.jsx`)**:
  - Live typeahead search filtering across **English Name, Arabic Name, CPR Number, Mobile Phone, and File Number**.
  - Integrated into the **Vitals & Clinical X-Rays Header** and the **Appointment Booking Modal**.
- **Doctor Profile Image Management (Dual Mode)**:
  - **Local File Upload**: Drag-and-drop or select any image (PNG, JPG, WebP up to 5MB) converting to Base64 in local IndexedDB.
  - **Web URL Link**: Direct image URL with quick presets (Male Dr, Female Dr, Dental Surgeon).
  - **Live Preview & Color Accent**: Real-time avatar preview with doctor's designated chair color ring and status indicator.
- **Dental Services Multi-Field Search & Catalog Filters**:
  - Live search across **Procedure Title, Standard Price (e.g. 25.000), Slot Duration (e.g. 30m, 60m, 1 slot), and Category**.
  - Category filters, Slot Duration selector (30m, 60m, 90m, 120m+), and Price/Duration sorting controls.

### ✅ E. Vitals Tracker & High-Capacity File Attachments
- **Full Clinical Vitals Log**: Blood Pressure, Resting Pulse, Temperature, Blood Sugar, SpO2, Weight, and Visual Analog Dental Pain Scale (0-10) with facial indicators.
- **100MB File Attachments Engine**: Supports Dental Panoramic X-Rays (OPG), CBCT scans, PDF medical records, and intraoral camera photos stored in IndexedDB and synchronized with the backend.

### ✅ F. Backend & Production Synchronization
- **Offline-First Architecture**: Dexie.js (IndexedDB) with bidirectional background sync to MySQL backend (`sync.php`).
- **Production Server Apache Configuration**: `.htaccess` configured with SPA rewrites, no-cache headers for `index.html`, and `index.php` fallback router.
- **Git Repo Optimization**: Large installer binaries excluded via `.gitignore` (`DevelopSupportFilesFolder/`, `dental-app/public/downloads/`), keeping the repository lightweight.

### ✅ G. Live Server Synchronization Center & Queue Inspector Modal
- **Comprehensive Entity Sync Handlers**: Full MySQL `INSERT ... ON DUPLICATE KEY UPDATE` handlers in `backend/api/sync.php` across all 7 entities: `patients`, `appointments`, `doctors`, `services`, `vitals`, `attachments`, and `settings`.
- **Preflight & CORS Headers**: Universal `OPTIONS` preflight and `Access-Control-Allow-Origin: *` headers for flawless localhost development and remote cloud synchronization.
- **Sync Center Modal (`SyncCenterModal.jsx`)**:
  - Accessible directly by clicking the **"Online / Offline [Count]"** badge in the upper header.
  - **Live Server Test & Ping**: Real-time HTTP ping test to verify endpoint connectivity (`alrabeesh.sandslab.com/backend/api/sync.php`) with latency ms and status codes.
  - **Outbox Queue Inspector**: Table listing every queued change (Entity, Operation type, ID, Timestamp) with entity breakdown metrics.
  - **Action Suite**: Push to Cloud, Simulate Server Sync (clears outbox count for local dev), Export Queue Backup (JSON), and Clear Outbox.
  - **Resilient Offline Retention**: Local changes are permanently preserved in IndexedDB even if the cloud server is unreachable or offline.

---

## 🔐 2. Server & Database Credentials Reference

| Service | Host / URL | Database / User | Password |
| :--- | :--- | :--- | :--- |
| **Production App** | `alrabeesh.sandslab.com` | `/home/sandsl23/public_html/alrabeesh.sandslab.com` | — |
| **MySQL Server** | `localhost` | Database: `sandsl23_alrabeeh_db`<br>User: `sandsl23_alrabeeh_user` | `S@nds1@b` |
| **Smart Card Bridge** | `ws://127.0.0.1:8080` | Local WebSocket Server | — |

---

## 🚀 3. Server 1-Click Update Command

When you pull changes on the production server, run:

```bash
git pull origin main
cp -f dental-app/dist/index.html .
rm -rf assets
cp -r dental-app/dist/assets .
```

---

## 🎯 4. Future Modules Roadmap (Saved for Development Reference)

The following modules are documented and scheduled for upcoming development phases:

### 1. 🦷 Interactive Dental Odontogram / Tooth Charting
- **Adult & Pediatric Tooth Charts**: Visual 32-tooth adult (FDI / Universal numbering) + 20-tooth primary pediatric chart.
- **Surface-Level Diagnosis & Conditions**: Occlusal, Mesial, Distal, Buccal, Lingual surface selection.
- **Color-Coded Statuses**: Existing condition (Healthy, Decayed/Caries, Missing, Impacted, Crown, Bridge, Filled, Root Canal) vs. Proposed Treatment vs. Completed Treatment.
- **Linked Treatment Plans**: Automatic service and cost calculation from marked tooth procedures linked to patient record.

### 2. 🧾 Billing, Bahrain VAT & Insurance Invoicing
- **National VAT Invoicing**: Compliant with Bahrain National Bureau for Revenue (NBR) rules (10% VAT calculation, Tax Invoice format, Tax Registration Number).
- **Payment Processing**: Multi-mode tender (BenefitPay, Credit/Debit Card, Cash, Insurance Split).
- **Insurance Copay & Claims**: Direct billing support for MedNet, Bupa Arabia, Bahrain National Insurance (BNI), Solidarity, Takaful, with claim form generation.
- **PDF Export & Thermal Receipt Printing**: Formats for standard A4 clinical invoices and 80mm POS thermal slips.

### 3. 💊 E-Prescriptions & Medication Management
- **Doctor Rx Generator**: Multi-drug prescription pad with dosage, frequency, duration, instructions (English & Arabic).
- **Standard Dental Drug Formulary**: Quick templates for antibiotics (Amoxicillin, Augmentin, Clindamycin), analgesics (Ibuprofen, Paracetamol), and antiseptics (Chlorhexidine rinse).
- **Printable & WhatsApp Rx**: One-click printable prescription slip and instant WhatsApp PDF delivery to patient.

### 4. 📱 Automated WhatsApp & SMS Reminders Gateway
- **Appointment Confirmations**: Automated 24-hour and 2-hour pre-appointment reminders.
- **WhatsApp Web / API Direct Link**: Click-to-send template messages with doctor name, clinic GPS, and appointment time.
- **Post-Treatment Follow-Ups**: Automated check-in reminders after extractions or surgeries.

### 5. 📈 Financial Reports & Chair Utilization Analytics
- **Doctor Revenue Breakdown**: Total collections, procedures performed, and commissions per doctor.
- **Chair Occupancy & Utilization**: Matrix showing utilization rates across chairs 1–5.
- **Daily Cash Register & Day-End Reconciliation**: Daily Z-Report for reception desk balancing.

---

*Handover & Roadmap Reference Document — Updated September 15, 2026*

