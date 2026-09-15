-- Al Rabeesh Dental Clinic Management System
-- MySQL Schema (UTF-8 MB4 Support)

CREATE DATABASE IF NOT EXISTS `sandsl23_alrabeeh_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sandsl23_alrabeeh_db`;

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` VARCHAR(50) PRIMARY KEY,
    `clinic_name` VARCHAR(255) NOT NULL DEFAULT 'Al Rabeesh Dental Specialty Center',
    `theme` VARCHAR(20) NOT NULL DEFAULT 'light',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Bahrain',
    `date_format` VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    `currency_code` VARCHAR(10) NOT NULL DEFAULT 'BHD',
    `currency_symbol` VARCHAR(10) NOT NULL DEFAULT 'BD',
    `currency_decimals` INT NOT NULL DEFAULT 3,
    `reader_ws_url` VARCHAR(255) NOT NULL DEFAULT 'ws://localhost:5060/SCardRead',
    `reader_rest_url` VARCHAR(255) NOT NULL DEFAULT 'http://localhost:5050/api/operation/ReadCard',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Branches Table (Multi-Branch Clinic Network)
CREATE TABLE IF NOT EXISTS `branches` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `prefix` VARCHAR(20) NOT NULL UNIQUE,
    `address` TEXT NULL,
    `phone` VARCHAR(30) NULL,
    `color` VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    `country` VARCHAR(50) NULL DEFAULT 'Bahrain',
    `currency_code` VARCHAR(10) NULL,
    `currency_symbol` VARCHAR(10) NULL,
    `currency_decimals` INT NULL,
    `timezone` VARCHAR(50) NULL,
    `date_format` VARCHAR(20) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed Default Branches
INSERT INTO `branches` (`id`, `name`, `code`, `prefix`, `address`, `phone`, `color`, `country`, `currency_code`, `currency_symbol`, `currency_decimals`, `timezone`, `date_format`, `is_active`)
VALUES
    ('branch-mnm', 'Al Rabeesh Manama Branch', 'MNM', 'ARB-MNM', 'Building 124, Road 3801, Manama Center', '+973 1722 3344', '#2563EB', 'Bahrain', 'BHD', 'BD', 3, 'Asia/Bahrain', 'DD/MM/YYYY', 1),
    ('branch-rfa', 'Al Rabeesh Riffa Branch', 'RFA', 'ARB-RFA', 'Villa 45, Avenue 12, East Riffa', '+973 1777 5566', '#10B981', 'Bahrain', 'BHD', 'BD', 3, 'Asia/Bahrain', 'DD/MM/YYYY', 1),
    ('branch-sef', 'Al Rabeesh Seef Branch', 'SEF', 'ARB-SEF', 'Seef Mall Medical Tower, 4th Floor', '+973 1758 9900', '#8B5CF6', 'Bahrain', 'BHD', 'BD', 3, 'Asia/Bahrain', 'DD/MM/YYYY', 1),
    ('branch-muh', 'Al Rabeesh Muharraq Branch', 'MUH', 'ARB-MUH', 'Road 2104, Block 221, Muharraq', '+973 1734 1122', '#F59E0B', 'Bahrain', 'BHD', 'BD', 3, 'Asia/Bahrain', 'DD/MM/YYYY', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Users & Staff Roles Table (Multi-Branch Access Control)
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL DEFAULT 'demo123',
    `full_name` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(50) NULL,
    `role` ENUM('SUPER_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'ADMIN', 'NURSE') NOT NULL DEFAULT 'RECEPTIONIST',
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed Default Multi-Branch Users & Staff
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `role`, `branch_id`, `is_active`)
VALUES
    ('usr-superadmin', 'superadmin', 'admin123', 'Dr. Al Rabeesh (Executive Director)', 'SUPER_ADMIN', NULL, 1),
    ('usr-admin-manama', 'admin_manama', 'admin123', 'Fatima Al-Sayed (Manama Branch Admin)', 'BRANCH_ADMIN', 'branch-mnm', 1),
    ('usr-admin-riffa', 'admin_riffa', 'admin123', 'Khalid Al-Dosari (Riffa Branch Admin)', 'BRANCH_ADMIN', 'branch-rfa', 1),
    ('usr-admin-seef', 'admin_seef', 'admin123', 'Mariam Bucheeri (Seef Branch Admin)', 'BRANCH_ADMIN', 'branch-sef', 1),
    ('usr-admin-muharraq', 'admin_muharraq', 'admin123', 'Zainab Al-Majed (Muharraq Branch Admin)', 'BRANCH_ADMIN', 'branch-muh', 1)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = VALUES(`role`), `branch_id` = VALUES(`branch_id`);


-- 4. Doctors Table
CREATE TABLE IF NOT EXISTS `doctors` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `specialty` VARCHAR(255) NOT NULL DEFAULT 'General Dental Surgeon',
    `qualification` VARCHAR(255) NOT NULL,
    `primary_branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm',
    `room_number` VARCHAR(100) NOT NULL,
    `chair_number` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `photo_url` LONGTEXT NULL,
    `color_tag` VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    `start_time` VARCHAR(10) NOT NULL DEFAULT '09:00',
    `end_time` VARCHAR(10) NOT NULL DEFAULT '17:00',
    `slot_duration_mins` INT NOT NULL DEFAULT 30,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_doc_branch` (`primary_branch_id`)
) ENGINE=InnoDB;

-- 5. Dental Services Catalog Table
CREATE TABLE IF NOT EXISTS `dental_services` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'General',
    `default_duration_mins` INT NOT NULL DEFAULT 30,
    `required_slots` INT NOT NULL DEFAULT 1,
    `price` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `description` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. Patients Table (Supports Smart Card Reader Data & Global Access with Branch Numbering)
CREATE TABLE IF NOT EXISTS `patients` (
    `id` VARCHAR(36) PRIMARY KEY,
    `file_number` VARCHAR(30) UNIQUE NOT NULL,
    `cpr_number` VARCHAR(30) NULL,
    `home_branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm',
    `created_at_branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm',
    `full_name_en` VARCHAR(150) NOT NULL,
    `full_name_ar` VARCHAR(150) NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(100) NULL,
    `dob` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL DEFAULT 'MALE',
    `nationality` VARCHAR(50) NULL,
    `blood_group` VARCHAR(10) NULL,
    `address` TEXT NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(30) NULL,
    `photo_base64` LONGTEXT NULL,
    `allergies` TEXT NULL,
    `medical_alerts` TEXT NULL,
    `source` VARCHAR(30) NOT NULL DEFAULT 'CARD_READER',
    `sync_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cpr` (`cpr_number`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_name` (`full_name_en`),
    INDEX `idx_home_branch` (`home_branch_id`)
) ENGINE=InnoDB;

-- 7. Patient Vitals Table
CREATE TABLE IF NOT EXISTS `patient_vitals` (
    `id` VARCHAR(36) PRIMARY KEY,
    `patient_id` VARCHAR(36) NOT NULL,
    `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `bp_systolic` INT NULL,
    `bp_diastolic` INT NULL,
    `pulse_bpm` INT NULL,
    `temperature_c` DECIMAL(4, 1) NULL,
    `spo2_percent` INT NULL,
    `blood_sugar_mg` INT NULL,
    `weight_kg` DECIMAL(5, 1) NULL,
    `pain_scale` INT NULL DEFAULT 0,
    `clinical_notes` TEXT NULL,
    `recorded_by_user_id` VARCHAR(36) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Patient Clinical Attachments Table (Up to 100MB File Support)
CREATE TABLE IF NOT EXISTS `patient_attachments` (
    `id` VARCHAR(36) PRIMARY KEY,
    `patient_id` VARCHAR(36) NOT NULL,
    `appointment_id` VARCHAR(36) NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `category` ENUM('XRAY_OPG', 'INTRAORAL_PHOTO', 'LAB_REPORT', 'PRESCRIPTION', 'ID_DOCUMENT', 'OTHER') NOT NULL DEFAULT 'XRAY_OPG',
    `file_size_bytes` BIGINT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_data_base64` LONGTEXT NULL,
    `notes` TEXT NULL,
    `uploaded_by_user_id` VARCHAR(36) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Appointments Table (Multi-Branch & Multi-Slot Booking Engine)
CREATE TABLE IF NOT EXISTS `appointments` (
    `id` VARCHAR(36) PRIMARY KEY,
    `branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm',
    `patient_id` VARCHAR(36) NOT NULL,
    `doctor_id` VARCHAR(36) NOT NULL,
    `service_id` VARCHAR(36) NULL,
    `appointment_date` DATE NOT NULL,
    `start_time` VARCHAR(10) NOT NULL,
    `end_time` VARCHAR(10) NOT NULL,
    `slot_count` INT NOT NULL DEFAULT 1,
    `duration_mins` INT NOT NULL DEFAULT 30,
    `status` ENUM('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `chief_complaint` TEXT NULL,
    `notes` TEXT NULL,
    `estimated_fee` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `sync_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    INDEX `idx_app_date_doc` (`appointment_date`, `doctor_id`),
    INDEX `idx_app_branch` (`branch_id`, `appointment_date`)
) ENGINE=InnoDB;

-- 10. Offline Outbox Sync Log Table
CREATE TABLE IF NOT EXISTS `sync_logs` (
    `id` VARCHAR(36) PRIMARY KEY,
    `client_device_id` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `action` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `synced_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Initial Settings Seed
INSERT INTO `system_settings` (`id`, `clinic_name`, `theme`, `timezone`, `date_format`, `currency_code`, `currency_symbol`, `currency_decimals`)
VALUES ('default_config', 'Al Rabeesh Dental Specialty Center', 'light', 'Asia/Bahrain', 'DD/MM/YYYY', 'BHD', 'BD', 3)
ON DUPLICATE KEY UPDATE `id` = `id`;
