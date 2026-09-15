# Al Rabeesh Dental Specialty Center Software

Comprehensive, offline-first Dental Practice Management System integrated with Bahrain & GCC Smart Card Hardware (CPR Reader), Single-Window Multi-Doctor Calendar, Patient File Registry, Clinical Vitals Tracker, Dental File Attachments (up to 100MB), and Gulf & India Regional Localization.

**Powered by [SaNDS Lab Middle East W.L.L](https://sandslab.com)**

---

## 🌟 Key Features

1. **💳 National Smart Card Reader (Bahrain & GCC Integration)**
   - Local WebSocket daemon bridge (`ws://localhost:5060/SCardRead`) & REST API.
   - 1-Click extraction of CPR number, Arabic & English names, DOB, gender, nationality, address, and base64 cardholder photo.
   - Built-in Smart Card Simulator for testing without physical reader.

2. **📅 Single-Window Multi-Doctor Calendar Matrix**
   - Side-by-side doctor columns displaying 5+ doctors in a single view.
   - Dynamic procedure-based slot duration engine (1 slot = 30m, 2 slots = 60m, 3 slots = 90m).
   - Configurable clinic operating hours (09:00 - 17:30) and break time blocker (13:00 - 14:00).

3. **👥 Patient Registry & Fast Search (4 Cards per Row)**
   - Multi-field search by CPR, Mobile, Arabic/English Name, or File ID (`PAT-2026-XXXX`).
   - Auto-generated sequential File IDs and 4-cards-per-row responsive grid.

4. **🩺 Clinical Vitals Tracker, Voice Dictation & File Attachments (Up to 100MB)**
   - Records BP, Pulse, Temperature, SpO2, Blood Sugar, Weight, and Visual Dental Pain Scale (0-10).
   - **🎙️ AI Voice Dictation**: Real-time microphone speech-to-text powered by Web Speech API, allowing doctors to speak and automatically type clinical notes hands-free.
   - **Widened 3-Column Modal**: Ergonomic layout optimized for quick logging.
   - Supports uploading and previewing high-res OPG X-Rays, Intraoral photos, CBCT scans, and PDF reports.

5. **⚙️ Regional Localization (Gulf & India)**
   - Bahrain Dinar (BHD 3 decimals: `BD 25.000`), Kuwait (KWD 3 decimals), Oman (OMR 3 decimals), Saudi Arabia (SAR), UAE (AED), India (INR).
   - Light / Dark theme toggle.

6. **📴 Offline-First Architecture (Dexie.js IndexedDB + PHP & MySQL Sync)**
   - Runs locally without internet interruption.
   - Automatic two-way batch synchronization when connection is re-established.

---

## 🚀 Quick Start

### Frontend (React + Vite)
```bash
cd dental-app
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### Backend (PHP & MySQL)
1. Import `backend/schema.sql` into MySQL database `alrabeesh_dental`.
2. Configure `backend/config/database.php`.
3. Serve with Apache, Nginx, or PHP CLI (`php -S localhost:8000`).

---

## 📁 Repository Structure

```
├── dental-app/                  # React 19 + Tailwind CSS Frontend
├── backend/                     # PHP Middleware & MySQL Schema
├── DevelopSupportFilesFolder/   # Full technical plans, guides & documentation
├── ReaderSDK/                   # Bahrain Smart Card Drivers & SDKs
└── README.md
```

---

## 🏢 Contact & Support
- **Company**: SaNDS Lab Middle East W.L.L (Manama, Kingdom of Bahrain)
- **WhatsApp / Tel**: [+973 35078079](https://wa.me/97335078079)
- **Email**: info@sandslab.com
- **Website**: [https://sandslab.com](https://sandslab.com)
- **Products**: [https://sandslab.com/products/](https://sandslab.com/products/)
