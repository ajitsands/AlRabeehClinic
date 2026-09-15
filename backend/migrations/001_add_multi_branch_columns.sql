-- Migration 001: Add Multi-Branch & Role Support to Existing MySQL Tables
USE `sandsl23_alrabeeh_db`;

-- 1. Create branches table if missing
CREATE TABLE IF NOT EXISTS `branches` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `prefix` VARCHAR(20) NOT NULL UNIQUE,
    `address` TEXT NULL,
    `phone` VARCHAR(30) NULL,
    `color` VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Insert Default 4 Clinic Branches
INSERT INTO `branches` (`id`, `name`, `code`, `prefix`, `address`, `phone`, `color`, `is_active`)
VALUES
    ('branch-mnm', 'Manama Flagship Center', 'MNM', 'ARB-MNM', 'Building 124, Road 3801, Manama Center', '+973 1722 3344', '#2563EB', 1),
    ('branch-rfa', 'Riffa Specialty Clinic', 'RFA', 'ARB-RFA', 'Villa 45, Avenue 12, East Riffa', '+973 1777 5566', '#059669', 1),
    ('branch-sef', 'Seef Aesthetic & Implant Center', 'SEF', 'ARB-SEF', 'Medical Tower, 4th Floor, Seef District', '+973 1758 9900', '#7C3AED', 1),
    ('branch-muh', 'Muharraq Family Dental', 'MUH', 'ARB-MUH', 'Road 2104, Block 221, Muharraq', '+973 1734 1122', '#D97706', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Add branch_id column and update role enum in users table
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `branch_id` VARCHAR(50) NULL AFTER `full_name`;
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('SUPER_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'ADMIN', 'NURSE') NOT NULL DEFAULT 'RECEPTIONIST';

-- 4. Add branch reference columns to appointments, patients, and doctors
ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm' AFTER `id`;
ALTER TABLE `patients` ADD COLUMN IF NOT EXISTS `home_branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm' AFTER `cpr_number`;
ALTER TABLE `patients` ADD COLUMN IF NOT EXISTS `created_at_branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm' AFTER `home_branch_id`;
ALTER TABLE `doctors` ADD COLUMN IF NOT EXISTS `primary_branch_id` VARCHAR(50) NOT NULL DEFAULT 'branch-mnm' AFTER `qualification`;
