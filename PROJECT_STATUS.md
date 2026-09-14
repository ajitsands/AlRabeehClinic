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

### ✅ D. Patient Directory & Select2 Searchable Dropdown
- **4 Cards per Row Grid Layout**: Enforced on Patient Registry, Doctors Directory, and Dental Services catalog (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- **Prominent Patient File Number Badges**: Extra-bold `PAT-2026-XXXX` badges across patient cards and directories.
- **Select2-Style Searchable Patient Dropdown (`SearchablePatientSelect.jsx`)**:
  - Live typeahead search filtering across **English Name, Arabic Name, CPR Number, Mobile Phone, and File Number**.
  - Integrated into the **Vitals & Clinical X-Rays Header** and the **Appointment Booking Modal**.

### ✅ E. Vitals Tracker & High-Capacity File Attachments
- **Full Clinical Vitals Log**: Blood Pressure, Resting Pulse, Temperature, Blood Sugar, SpO2, Weight, and Visual Analog Dental Pain Scale (0-10) with facial indicators.
- **100MB File Attachments Engine**: Supports Dental Panoramic X-Rays (OPG), CBCT scans, PDF medical records, and intraoral camera photos stored in IndexedDB and synchronized with the backend.

### ✅ F. Backend & Production Synchronization
- **Offline-First Architecture**: Dexie.js (IndexedDB) with bidirectional background sync to MySQL backend.
- **Production Server Apache Configuration**: `.htaccess` configured with SPA rewrites, no-cache headers for `index.html`, and `index.php` fallback router.
- **Git Repo Optimization**: Large installer binaries excluded via `.gitignore` (`DevelopSupportFilesFolder/`, `dental-app/public/downloads/`), keeping the repository lightweight.

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

## 🎯 4. Starting Points for Next Session (Resume In 5 Hours)

When development restarts, here are recommended next areas to build or refine based on clinic workflow requirements:

1. **Billing & Invoicing Module**:
   - Generate official Bahrain VAT dental invoices with PDF export and print layouts.
   - Insurance claims processing (e.g., MedNet, Bupa, Bahrain National Insurance).
2. **Interactive Dental Odontogram / Tooth Charting**:
   - Visual 32-tooth adult + 20-tooth pediatric interactive chart.
   - Tooth-specific treatments: Cavity, Restoration, Root Canal, Crown, Extraction, Implant.
3. **Prescription & Pharmacy Management**:
   - Doctor e-prescription generator with dosage instructions (English + Arabic).
4. **Automated WhatsApp / SMS Reminders**:
   - 24-hour appointment confirmation and reminder dispatch via clinic WhatsApp gateway.
5. **Detailed Reports & Financial Analytics**:
   - Daily revenue by doctor, chair utilization rates, and patient visit analytics.

---

*Note saved for next session handover.*
