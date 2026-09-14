# Database Schema & Two-Way Sync Architecture

**Location:** `e:\Al Rabeesh Software\DevelopSupportFilesFolder\Database_Schema_and_Sync.md`

---

## 1. Offline-First Architecture (Dexie.js IndexedDB)

When the clinic operates without internet, all transactions are recorded in the client's high-speed local database:
- **Engine**: Dexie.js (IndexedDB wrapper)
- **Local Outbox Table**: `sync_outbox`
- **Fields in Outbox**:
  - `id`: Auto-incrementing queue ID
  - `entity_table`: Target table name (`patients`, `appointments`, `vitals`, etc.)
  - `entity_id`: Primary key of modified entity
  - `action`: `'INSERT'`, `'UPDATE'`, `'DELETE'`
  - `payload`: JSON payload of the record
  - `timestamp`: ISO timestamp
  - `status`: `'PENDING'`, `'SYNCED'`, `'FAILED'`

---

## 2. Server MySQL Schema (`backend/schema.sql`)

The MySQL database schema is structured for dental practices with UTF-8 Multilingual support (`utf8mb4`):

```sql
CREATE DATABASE IF NOT EXISTS alrabeesh_dental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alrabeesh_dental;

-- 1. Clinic Settings & Localization
CREATE TABLE IF NOT EXISTS clinic_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    file_number VARCHAR(50) UNIQUE NOT NULL,
    cpr_number VARCHAR(20) UNIQUE,
    full_name_en VARCHAR(255) NOT NULL,
    full_name_ar VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    dob DATE,
    gender ENUM('MALE', 'FEMALE', 'OTHER') DEFAULT 'MALE',
    nationality VARCHAR(100) DEFAULT 'Bahraini',
    blood_group VARCHAR(10),
    address TEXT,
    photo_base64 LONGTEXT,
    allergies TEXT,
    medical_alerts TEXT,
    source ENUM('MANUAL', 'CARD_READER', 'IMPORT') DEFAULT 'MANUAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Doctors & Dental Chairs Table
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(150),
    qualification VARCHAR(255),
    room_number VARCHAR(50),
    chair_number VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    photo_url TEXT,
    color_tag VARCHAR(20) DEFAULT '#2563eb',
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '17:00:00',
    slot_duration_mins INT DEFAULT 30,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Dental Services & Tariffs
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    default_duration_mins INT DEFAULT 30,
    required_slots INT DEFAULT 1,
    price DECIMAL(10, 3) NOT NULL,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Appointments & Calendar Matrix
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    doctor_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    service_id VARCHAR(64),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_count INT DEFAULT 1,
    duration_mins INT DEFAULT 30,
    status ENUM('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW') DEFAULT 'CONFIRMED',
    chief_complaint TEXT,
    notes TEXT,
    fee_amount DECIMAL(10, 3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 6. Clinical Vitals
CREATE TABLE IF NOT EXISTS vitals (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    appointment_id VARCHAR(64),
    systolic_bp INT,
    diastolic_bp INT,
    pulse_rate INT,
    temperature_c DECIMAL(4, 1),
    spo2_percent INT,
    blood_sugar_mg INT,
    weight_kg DECIMAL(5, 2),
    pain_scale INT DEFAULT 0,
    recorded_by VARCHAR(100),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 7. Large Dental Attachments (Up to 100MB)
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    appointment_id VARCHAR(64),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    category ENUM('OPG_XRAY', 'INTRAORAL_PHOTO', 'CBCT_SCAN', 'LAB_REPORT', 'PRESCRIPTION', 'GENERAL') DEFAULT 'OPG_XRAY',
    file_data_base64 LONGTEXT,
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

---

## 3. Two-Way Batch Sync Protocol (`backend/api/sync.php`)

1. **Client Sends Push Payload**:
   Sends an array of pending changes from `sync_outbox`:
   ```json
   {
     "last_pulled_at": "2026-09-15T00:00:00Z",
     "changes": [
       {
         "entity_table": "patients",
         "entity_id": "pat-1789420000",
         "action": "INSERT",
         "payload": { ... }
       }
     ]
   }
   ```
2. **Server Processes Changes**:
   - Executes upsert (`INSERT ... ON DUPLICATE KEY UPDATE`) for each record in MySQL.
   - Logs change in `sync_logs`.
3. **Server Responds with Pull Delta**:
   - Returns all records modified on the server since `last_pulled_at`.
   - Client updates local Dexie.js cache with server updates.
