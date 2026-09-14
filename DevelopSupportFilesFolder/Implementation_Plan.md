# Al Rabeesh Dental Software — Technical Implementation Plan

**Location:** `e:\Al Rabeesh Software\DevelopSupportFilesFolder\Implementation_Plan.md`

---

## 1. System Architecture Overview

```
+-------------------------------------------------------------------------------+
|                       CLIENT TIER (React 19 + Tailwind CSS)                   |
|                                                                               |
|  [Horizontal Navigation Bar]  [Single-Window Multi-Doctor Calendar (5 Doctors)]|
|  [Smart Card Reader Daemon Bridge] [Vitals & 100MB X-Ray Attachment Preview]  |
|  [Patient File Registry & Fast Search] [Gulf & India Localization Engine]     |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                       LOCAL STORAGE & OFFLINE ENGINE                    |  |
|  |   IndexedDB (Dexie.js) Cache <---> Outbox Sync Queue (syncEngine.js)     |  |
|  +-------------------------------------------------------------------------+  |
+--------------------------------------|----------------------------------------+
                                       |
                   HTTP POST /api/sync.php (When Online)
                                       |
+--------------------------------------v----------------------------------------+
|                      MIDDLEWARE & SERVER TIER (PHP 8 + PDO)                   |
|                                                                               |
|  [REST API Router]  [Two-Way Batch Push/Pull Synchronizer]  [Auth & Loggers]  |
+--------------------------------------|----------------------------------------+
                                       |
+--------------------------------------v----------------------------------------+
|                          DATABASE TIER (MySQL 8)                              |
|                                                                               |
|  - patients        - doctors          - appointments      - vitals            |
|  - attachments     - services         - clinic_settings   - sync_logs         |
+-------------------------------------------------------------------------------+
```

---

## 2. Core Modules Specification

### A. Smart Card Reader Integration
- **Technology**: Local WebSocket / HTTP REST bridge (`ws://localhost:5060/SCardRead` and `http://localhost:5050/api/operation/ReadCard`).
- **Hardware Daemon**: Windows Service `CIO GCC CardRead Server` (`SCardReadWebApi.exe`).
- **Fields Extracted**:
  - `CPRNumber`: Unique Civil/National ID Number
  - `CardHolderNameEn` / `CardHolderNameAr`: Full dual-language name
  - `DateOfBirth`: YYYY-MM-DD
  - `Sex`: Male / Female
  - `Nationality`: Country of citizenship
  - `Address`: Flat, Building, Road, Block, Area
  - `CardHolderPhoto`: Base64 JPEG/PNG string
- **Simulator Mode**: Built-in fallback presets for Bahraini, GCC, and Expatriate identities for testing without physical reader.

### B. Single-Window Multi-Doctor Calendar Matrix
- **Layout**: Side-by-side doctor columns displaying all doctors simultaneously on a single screen without needing to switch tabs.
- **Dynamic Slot Duration**:
  - Automatically calculates slot counts based on procedure type (1 slot = 30m, 2 slots = 60m, 3 slots = 90m).
- **Operating Hours & Break Scheduler**:
  - Configurable opening (09:00), closing (17:30), and slot interval (30m).
  - Configurable break window (13:00 to 14:00) with locked striped visual blocks preventing accidental booking during lunch/prayer breaks.
- **Appointment Statuses**: `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_CHAIR`, `COMPLETED`, `CANCELLED`.

### C. Patient Registry & Search Engine
- **Search Capabilities**: Instant search by CPR, Mobile, Arabic Name, English Name, or Patient File ID (`PAT-2026-XXXX`).
- **4 Cards Per Row Grid**: Clean responsive layout displaying 4 cards per row on standard desktop monitors.

### D. Clinical Vitals & Large File Attachments
- **Vitals Metrics**: Blood Pressure, Pulse, SpO2, Temperature, Blood Sugar, Weight, and Visual Dental Pain Index (0–10).
- **File Management**: Up to 100MB per file with support for OPG X-Rays, Intraoral Photos, CBCT scans, PDF reports, and prescriptions.

### E. Settings & Regional Localization
- **Presets**: Bahrain BHD (3 decimals), Kuwait KWD (3 decimals), Oman OMR (3 decimals), Saudi SAR (2 decimals), UAE AED (2 decimals), India INR (2 decimals).
- **Theming**: Default Light Theme with Dark Theme toggle.
- **SaNDS Lab Modal**: Company credentials, WhatsApp direct link (+973 35078079), product catalog, and website.

---

## 3. Database Schema (MySQL + Dexie.js)

### Tables:
1. `patients` (id, file_number, cpr_number, full_name_en, full_name_ar, phone, email, dob, gender, nationality, blood_group, address, photo_base64, allergies, medical_alerts, source, created_at, updated_at)
2. `doctors` (id, name, specialty, qualification, room_number, chair_number, phone, email, photo_url, color_tag, start_time, end_time, slot_duration_mins, is_active, created_at, updated_at)
3. `services` (id, name, category, default_duration_mins, required_slots, price, description, is_active, created_at, updated_at)
4. `appointments` (id, doctor_id, patient_id, service_id, appointment_date, start_time, end_time, slot_count, duration_mins, status, chief_complaint, notes, fee_amount, created_at, updated_at)
5. `vitals` (id, patient_id, appointment_id, systolic_bp, diastolic_bp, pulse_rate, temperature_c, spo2_percent, blood_sugar_mg, weight_kg, pain_scale, recorded_by, notes, recorded_at, created_at, updated_at)
6. `attachments` (id, patient_id, appointment_id, file_name, file_type, file_size_bytes, category, file_data_base64, notes, uploaded_at, created_at, updated_at)
7. `clinic_settings` (id, setting_key, setting_value, updated_at)
8. `sync_logs` (id, entity_table, entity_id, action, status, payload, synced_at)
