import Dexie from 'dexie';

export const db = new Dexie('AlRabeeshDentalDB');

// Database Schema (Version 2 with Multi-Branch Support)
db.version(1).stores({
  patients: 'id, file_number, cpr_number, phone, full_name_en, full_name_ar, created_at, updated_at',
  vitals: 'id, patient_id, recorded_at, created_at',
  attachments: 'id, patient_id, appointment_id, category, created_at',
  doctors: 'id, name, specialty, chair_number, is_active',
  appointments: 'id, patient_id, doctor_id, appointment_date, start_time, status, updated_at',
  services: 'id, name, category, required_slots, is_active',
  settings: 'id',
  outbox_sync: '++auto_id, id, entityType, entityId, operation, timestamp, status'
});

db.version(2).stores({
  branches: 'id, code, name, prefix, is_active',
  users: 'id, username, full_name, role, branch_id, is_active',
  patients: 'id, file_number, cpr_number, phone, full_name_en, full_name_ar, home_branch_id, created_at, updated_at',
  vitals: 'id, patient_id, recorded_at, created_at',
  attachments: 'id, patient_id, appointment_id, category, created_at',
  doctors: 'id, name, specialty, chair_number, primary_branch_id, is_active',
  appointments: 'id, patient_id, doctor_id, branch_id, appointment_date, start_time, status, updated_at',
  services: 'id, name, category, required_slots, is_active',
  settings: 'id',
  outbox_sync: '++auto_id, id, entityType, entityId, operation, timestamp, status'
});

// Seed Fresh Multi-Branch Clinic Data
export async function seedFreshMultiBranchData() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Clear existing tables
  await Promise.all([
    db.branches.clear(),
    db.users.clear(),
    db.doctors.clear(),
    db.services.clear(),
    db.patients.clear(),
    db.appointments.clear(),
    db.vitals.clear(),
    db.attachments.clear(),
    db.settings.clear(),
    db.outbox_sync.clear()
  ]);

  // 2. Seed 4 Distinct Clinic Branches
  await db.branches.bulkPut([
    {
      id: 'branch-mnm',
      code: 'MNM',
      name: 'Manama Flagship Center',
      prefix: 'ARB-MNM',
      phone: '+973 1722 3344',
      address: 'Building 124, Road 3801, Manama Center, Bahrain',
      color: '#2563EB', // Blue
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'branch-rfa',
      code: 'RFA',
      name: 'Riffa Specialty Clinic',
      prefix: 'ARB-RFA',
      phone: '+973 1777 5566',
      address: 'Villa 45, Avenue 12, East Riffa, Bahrain',
      color: '#059669', // Emerald Green
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'branch-sef',
      code: 'SEF',
      name: 'Seef Aesthetic & Implant Center',
      prefix: 'ARB-SEF',
      phone: '+973 1758 9900',
      address: 'Medical Tower, 4th Floor, Seef District, Bahrain',
      color: '#7C3AED', // Purple
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'branch-muh',
      code: 'MUH',
      name: 'Muharraq Family Dental',
      prefix: 'ARB-MUH',
      phone: '+973 1734 1122',
      address: 'Road 2104, Block 221, Muharraq, Bahrain',
      color: '#D97706', // Amber Orange
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  // 3. Seed Users & Staff Roles strictly by Branch
  await db.users.bulkPut([
    // HQ Global Access
    {
      id: 'usr-superadmin',
      username: 'superadmin',
      full_name: 'Dr. Tariq Al Rabeesh (Executive Director)',
      role: 'SUPER_ADMIN',
      branch_id: null,
      email: 'executive@alrabeesh.com',
      phone: '+973 3900 0001',
      is_active: true
    },
    // Manama Staff
    {
      id: 'usr-admin-mnm',
      username: 'admin_manama',
      full_name: 'Fatima Al-Sayed (Manama Branch Admin)',
      role: 'BRANCH_ADMIN',
      branch_id: 'branch-mnm',
      email: 'manama.admin@alrabeesh.com',
      phone: '+973 3911 1111',
      is_active: true
    },
    {
      id: 'usr-rec-mnm',
      username: 'reception_manama',
      full_name: 'Ali Al-Balooshi (Manama Front Desk)',
      role: 'RECEPTIONIST',
      branch_id: 'branch-mnm',
      email: 'manama.reception@alrabeesh.com',
      phone: '+973 1722 3344',
      is_active: true
    },
    {
      id: 'usr-doc-salman',
      username: 'dr_salman',
      full_name: 'Dr. Salman Al-Khalifa',
      role: 'DOCTOR',
      branch_id: 'branch-mnm',
      email: 'dr.salman@alrabeesh.com',
      phone: '+973 3922 1100',
      is_active: true
    },
    {
      id: 'usr-doc-sarah',
      username: 'dr_sarah',
      full_name: 'Dr. Sarah Al-Mahmood',
      role: 'DOCTOR',
      branch_id: 'branch-mnm',
      email: 'dr.sarah@alrabeesh.com',
      phone: '+973 3933 2211',
      is_active: true
    },

    // Riffa Staff
    {
      id: 'usr-admin-rfa',
      username: 'admin_riffa',
      full_name: 'Khalid Al-Dosari (Riffa Branch Admin)',
      role: 'BRANCH_ADMIN',
      branch_id: 'branch-rfa',
      email: 'riffa.admin@alrabeesh.com',
      phone: '+973 3922 2222',
      is_active: true
    },
    {
      id: 'usr-rec-rfa',
      username: 'reception_riffa',
      full_name: 'Huda Al-Nuaimi (Riffa Front Desk)',
      role: 'RECEPTIONIST',
      branch_id: 'branch-rfa',
      email: 'riffa.reception@alrabeesh.com',
      phone: '+973 1777 5566',
      is_active: true
    },
    {
      id: 'usr-doc-noor',
      username: 'dr_noor',
      full_name: 'Dr. Noor Al-Hassan',
      role: 'DOCTOR',
      branch_id: 'branch-rfa',
      email: 'dr.noor@alrabeesh.com',
      phone: '+973 3944 3322',
      is_active: true
    },
    {
      id: 'usr-doc-tariq',
      username: 'dr_tariq',
      full_name: 'Dr. Tariq Al-Ghatam',
      role: 'DOCTOR',
      branch_id: 'branch-rfa',
      email: 'dr.tariq@alrabeesh.com',
      phone: '+973 3955 4433',
      is_active: true
    },

    // Seef Staff
    {
      id: 'usr-admin-sef',
      username: 'admin_seef',
      full_name: 'Mariam Bucheeri (Seef Branch Admin)',
      role: 'BRANCH_ADMIN',
      branch_id: 'branch-sef',
      email: 'seef.admin@alrabeesh.com',
      phone: '+973 3933 3333',
      is_active: true
    },
    {
      id: 'usr-rec-sef',
      username: 'reception_seef',
      full_name: 'Dana Al-Ghatam (Seef Front Desk)',
      role: 'RECEPTIONIST',
      branch_id: 'branch-sef',
      email: 'seef.reception@alrabeesh.com',
      phone: '+973 1758 9900',
      is_active: true
    },
    {
      id: 'usr-doc-reem',
      username: 'dr_reem',
      full_name: 'Dr. Reem Al-Kooheji',
      role: 'DOCTOR',
      branch_id: 'branch-sef',
      email: 'dr.reem@alrabeesh.com',
      phone: '+973 3966 5544',
      is_active: true
    },
    {
      id: 'usr-doc-adel',
      username: 'dr_adel',
      full_name: 'Dr. Adel Bukamal',
      role: 'DOCTOR',
      branch_id: 'branch-sef',
      email: 'dr.adel@alrabeesh.com',
      phone: '+973 3977 6655',
      is_active: true
    },

    // Muharraq Staff
    {
      id: 'usr-admin-muh',
      username: 'admin_muharraq',
      full_name: 'Zainab Al-Majed (Muharraq Branch Admin)',
      role: 'BRANCH_ADMIN',
      branch_id: 'branch-muh',
      email: 'muharraq.admin@alrabeesh.com',
      phone: '+973 3944 4444',
      is_active: true
    },
    {
      id: 'usr-rec-muh',
      username: 'reception_muharraq',
      full_name: 'Ahmed Al-Kaabi (Muharraq Front Desk)',
      role: 'RECEPTIONIST',
      branch_id: 'branch-muh',
      email: 'muharraq.reception@alrabeesh.com',
      phone: '+973 1734 1122',
      is_active: true
    },
    {
      id: 'usr-doc-layla',
      username: 'dr_layla',
      full_name: 'Dr. Layla Al-Jowder',
      role: 'DOCTOR',
      branch_id: 'branch-muh',
      email: 'dr.layla@alrabeesh.com',
      phone: '+973 3988 7766',
      is_active: true
    },
    {
      id: 'usr-doc-hamad',
      username: 'dr_hamad',
      full_name: 'Dr. Hamad Al-Thawadi',
      role: 'DOCTOR',
      branch_id: 'branch-muh',
      email: 'dr.hamad@alrabeesh.com',
      phone: '+973 3999 8877',
      is_active: true
    }
  ]);

  // 4. Seed 8 Dedicated Doctors (2 per branch across Manama, Riffa, Seef, Muharraq)
  await db.doctors.bulkPut([
    // Manama Branch Doctors
    {
      id: 'doc-mnm-1',
      name: 'Dr. Salman Al-Khalifa',
      specialty: 'Senior Dental Implantologist & Oral Surgeon',
      qualification: 'BDS, MSc Oral Surgery (UK)',
      room_number: 'Room 101',
      chair_number: 'Manama Chair 1 (Surgical)',
      primary_branch_id: 'branch-mnm',
      branches_assigned: ['branch-mnm'],
      phone: '+973 3922 1100',
      email: 'dr.salman@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
      color_tag: '#2563EB', // Blue
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },
    {
      id: 'doc-mnm-2',
      name: 'Dr. Sarah Al-Mahmood',
      specialty: 'Orthodontics & Invisible Aligners',
      qualification: 'DDS, Orthodontics Board Certified',
      room_number: 'Room 102',
      chair_number: 'Manama Chair 2 (Ortho)',
      primary_branch_id: 'branch-mnm',
      branches_assigned: ['branch-mnm'],
      phone: '+973 3933 2211',
      email: 'dr.sarah@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1594824813598-a1c6a6f65152?w=200&auto=format&fit=crop&q=80',
      color_tag: '#0284C7', // Sky Blue
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },

    // Riffa Branch Doctors
    {
      id: 'doc-rfa-1',
      name: 'Dr. Noor Al-Hassan',
      specialty: 'Endodontics & Root Canal Specialist',
      qualification: 'BDS, Endodontics Master (Cairo)',
      room_number: 'Room 201',
      chair_number: 'Riffa Chair 1 (Endo)',
      primary_branch_id: 'branch-rfa',
      branches_assigned: ['branch-rfa'],
      phone: '+973 3944 3322',
      email: 'dr.noor@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
      color_tag: '#059669', // Emerald Green
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },
    {
      id: 'doc-rfa-2',
      name: 'Dr. Tariq Al-Ghatam',
      specialty: 'General Dental Surgeon & Restorative Care',
      qualification: 'BDS, Restorative Fellow (UK)',
      room_number: 'Room 202',
      chair_number: 'Riffa Chair 2 (Restorative)',
      primary_branch_id: 'branch-rfa',
      branches_assigned: ['branch-rfa'],
      phone: '+973 3955 4433',
      email: 'dr.tariq@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
      color_tag: '#10B981', // Teal
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },

    // Seef Branch Doctors
    {
      id: 'doc-sef-1',
      name: 'Dr. Reem Al-Kooheji',
      specialty: 'Cosmetic Dentistry & Hollywood Smile Design',
      qualification: 'BDS, AACD Cosmetic Fellow (USA)',
      room_number: 'Room 301',
      chair_number: 'Seef Chair 1 (VIP Aesthetics)',
      primary_branch_id: 'branch-sef',
      branches_assigned: ['branch-sef'],
      phone: '+973 3966 5544',
      email: 'dr.reem@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1594824813585-802526e033d5?w=200&auto=format&fit=crop&q=80',
      color_tag: '#7C3AED', // Purple
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },
    {
      id: 'doc-sef-2',
      name: 'Dr. Adel Bukamal',
      specialty: 'Periodontics & Gum Regeneration Specialist',
      qualification: 'MDS Periodontology (UK)',
      room_number: 'Room 302',
      chair_number: 'Seef Chair 2 (Periodontics)',
      primary_branch_id: 'branch-sef',
      branches_assigned: ['branch-sef'],
      phone: '+973 3977 6655',
      email: 'dr.adel@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80',
      color_tag: '#8B5CF6', // Violet
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },

    // Muharraq Branch Doctors
    {
      id: 'doc-muh-1',
      name: 'Dr. Layla Al-Jowder',
      specialty: 'Pediatric Dentistry & Preventive Care',
      qualification: 'MDS Pediatric Dentistry',
      room_number: 'Room 401',
      chair_number: 'Muharraq Chair 1 (Kids & Family)',
      primary_branch_id: 'branch-muh',
      branches_assigned: ['branch-muh'],
      phone: '+973 3988 7766',
      email: 'dr.layla@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
      color_tag: '#D97706', // Amber
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    },
    {
      id: 'doc-muh-2',
      name: 'Dr. Hamad Al-Thawadi',
      specialty: 'Oral Surgery & Wisdom Tooth Extraction',
      qualification: 'BDS, Laser & Surgical Fellow',
      room_number: 'Room 402',
      chair_number: 'Muharraq Chair 2 (Surgical)',
      primary_branch_id: 'branch-muh',
      branches_assigned: ['branch-muh'],
      phone: '+973 3999 8877',
      email: 'dr.hamad@alrabeesh.com',
      photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
      color_tag: '#EA580C', // Orange
      start_time: '09:00',
      end_time: '17:30',
      slot_duration_mins: 30,
      is_active: true
    }
  ]);

  // 5. Seed Dental Services Catalog
  await db.services.bulkPut([
    {
      id: 'srv-1',
      name: 'Comprehensive Dental Examination & Consultation',
      category: 'Diagnostic',
      default_duration_mins: 30,
      required_slots: 1,
      price: 15.000,
      description: 'Complete oral cavity examination, digital X-rays evaluation, and treatment plan.',
      is_active: true
    },
    {
      id: 'srv-2',
      name: 'Scaling, Polishing & Ultrasonic Deep Cleaning',
      category: 'Preventive',
      default_duration_mins: 30,
      required_slots: 1,
      price: 25.000,
      description: 'Ultrasonic tartar removal, plaque removal, and fluoride polish.',
      is_active: true
    },
    {
      id: 'srv-3',
      name: 'Root Canal Treatment (RCT - First Session)',
      category: 'Endodontics',
      default_duration_mins: 60,
      required_slots: 2,
      price: 65.000,
      description: 'Pulp extirpation, canal shaping, biomechanical preparation under rubber dam.',
      is_active: true
    },
    {
      id: 'srv-4',
      name: 'Composite Aesthetic Filling (Per Tooth)',
      category: 'Restorative',
      default_duration_mins: 30,
      required_slots: 1,
      price: 20.000,
      description: 'Tooth-colored composite resin restoration with light curing.',
      is_active: true
    },
    {
      id: 'srv-5',
      name: 'Surgical Tooth / Impacted Molar Extraction',
      category: 'Oral Surgery',
      default_duration_mins: 60,
      required_slots: 2,
      price: 45.000,
      description: 'Complex wisdom tooth extraction with local anesthesia and suture.',
      is_active: true
    },
    {
      id: 'srv-6',
      name: 'Titanium Dental Implant Placement',
      category: 'Implantology',
      default_duration_mins: 90,
      required_slots: 3,
      price: 280.000,
      description: 'Precision surgical implant fixture placement with surgical guide.',
      is_active: true
    },
    {
      id: 'srv-7',
      name: 'In-Office Zoom Laser Teeth Whitening',
      category: 'Cosmetic',
      default_duration_mins: 60,
      required_slots: 2,
      price: 85.000,
      description: 'Advanced dental bleaching for 6-8 shades lighter smile in one sitting.',
      is_active: true
    },
    {
      id: 'srv-8',
      name: 'Zirconia / Porcelain Dental Crown',
      category: 'Prosthodontics',
      default_duration_mins: 60,
      required_slots: 2,
      price: 110.000,
      description: 'Tooth preparation, 3D intraoral scan/impression, temporary crown fabrication.',
      is_active: true
    },
    {
      id: 'srv-9',
      name: 'Orthodontic Consultation & Wire Adjustment',
      category: 'Orthodontics',
      default_duration_mins: 30,
      required_slots: 1,
      price: 25.000,
      description: 'Braces adjustment, archwire change, elastic ligatures replacement.',
      is_active: true
    }
  ]);

  // 6. Seed Sample Patients with Unique Branch File Numbers
  await db.patients.bulkPut([
    // Manama Patients
    {
      id: 'pat-mnm-1',
      file_number: 'ARB-MNM-26-0001',
      cpr_number: '880512341',
      full_name_en: 'Mohammed Ebrahim Al-Ghatam',
      full_name_ar: 'محمد إبراهيم الغتم',
      phone: '+973 3988 7766',
      email: 'm.ghatam@example.com',
      dob: '1988-05-12',
      gender: 'MALE',
      nationality: 'Bahraini',
      blood_group: 'O+',
      address: 'Road 3801, Block 338, Adliya, Manama',
      emergency_contact_name: 'Fatima Al-Ghatam (Wife)',
      emergency_contact_phone: '+973 3911 2233',
      photo_base64: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      allergies: 'Penicillin',
      medical_alerts: 'Hypertension (Medicated)',
      home_branch_id: 'branch-mnm',
      created_at_branch_id: 'branch-mnm',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'pat-mnm-2',
      file_number: 'ARB-MNM-26-0002',
      cpr_number: '920945672',
      full_name_en: 'Maryam Yousif Bucheeri',
      full_name_ar: 'مريم يوسف بوجيري',
      phone: '+973 3944 1122',
      email: 'maryam.bucheeri@example.com',
      dob: '1992-09-24',
      gender: 'FEMALE',
      nationality: 'Bahraini',
      blood_group: 'A+',
      address: 'Villa 18, Road 210, Juffair, Manama',
      emergency_contact_name: 'Yousif Bucheeri (Father)',
      emergency_contact_phone: '+973 3922 4455',
      photo_base64: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      allergies: 'None',
      medical_alerts: 'None',
      home_branch_id: 'branch-mnm',
      created_at_branch_id: 'branch-mnm',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString()
    },

    // Riffa Patients
    {
      id: 'pat-rfa-1',
      file_number: 'ARB-RFA-26-0001',
      cpr_number: '871134561',
      full_name_en: 'Jasim Hamad Al-Dosari',
      full_name_ar: 'جاسم حمد الدوسري',
      phone: '+973 3655 4433',
      email: 'jasim.dosari@example.com',
      dob: '1987-11-14',
      gender: 'MALE',
      nationality: 'Bahraini',
      blood_group: 'B+',
      address: 'Villa 450, Road 925, East Riffa',
      emergency_contact_name: 'Hamad Al-Dosari (Father)',
      emergency_contact_phone: '+973 3322 1100',
      photo_base64: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      allergies: 'None',
      medical_alerts: 'Type 2 Diabetes',
      home_branch_id: 'branch-rfa',
      created_at_branch_id: 'branch-rfa',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'pat-rfa-2',
      file_number: 'ARB-RFA-26-0002',
      cpr_number: '950487652',
      full_name_en: 'Fatima Nasser Al-Nuaimi',
      full_name_ar: 'فاطمة ناصر النعيمي',
      phone: '+973 3977 8899',
      email: 'fatima.nuaimi@example.com',
      dob: '1995-04-18',
      gender: 'FEMALE',
      nationality: 'Bahraini',
      blood_group: 'O-',
      address: 'Building 88, West Riffa',
      emergency_contact_name: 'Nasser Al-Nuaimi (Father)',
      emergency_contact_phone: '+973 3988 5522',
      photo_base64: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      allergies: 'Latex',
      medical_alerts: 'None',
      home_branch_id: 'branch-rfa',
      created_at_branch_id: 'branch-rfa',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString()
    },

    // Seef Patients
    {
      id: 'pat-sef-1',
      file_number: 'ARB-SEF-26-0001',
      cpr_number: '910245671',
      full_name_en: 'Dr. Reem Abdulrahman Al-Kooheji',
      full_name_ar: 'د. ريم عبدالرحمن الكوهجي',
      phone: '+973 3409 8877',
      email: 'reem.kooheji@example.com',
      dob: '1991-02-15',
      gender: 'FEMALE',
      nationality: 'Bahraini',
      blood_group: 'AB+',
      address: 'Seef Mall Tower 2, Seef District',
      emergency_contact_name: 'Abdulrahman Al-Kooheji (Father)',
      emergency_contact_phone: '+973 3455 6677',
      photo_base64: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      allergies: 'Sulfa Drugs',
      medical_alerts: 'Asthma (Mild)',
      home_branch_id: 'branch-sef',
      created_at_branch_id: 'branch-sef',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'pat-sef-2',
      file_number: 'ARB-SEF-26-0002',
      cpr_number: '860798762',
      full_name_en: 'Fahad Khalid Al-Zayani',
      full_name_ar: 'فهد خالد الزياني',
      phone: '+973 3922 8844',
      email: 'fahad.zayani@example.com',
      dob: '1986-07-29',
      gender: 'MALE',
      nationality: 'Bahraini',
      blood_group: 'A+',
      address: 'Villa 112, Reef Island, Seef',
      emergency_contact_name: 'Khalid Al-Zayani (Father)',
      emergency_contact_phone: '+973 3911 8833',
      photo_base64: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      allergies: 'None',
      medical_alerts: 'None',
      home_branch_id: 'branch-sef',
      created_at_branch_id: 'branch-sef',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date().toISOString()
    },

    // Muharraq Patients
    {
      id: 'pat-muh-1',
      file_number: 'ARB-MUH-26-0001',
      cpr_number: '940623451',
      full_name_en: 'Ali Hasan Al-Jowder',
      full_name_ar: 'علي حسن الجودر',
      phone: '+973 3918 2736',
      email: 'ali.jowder@example.com',
      dob: '1994-06-20',
      gender: 'MALE',
      nationality: 'Bahraini',
      blood_group: 'O+',
      address: 'Road 2101, Block 221, Muharraq',
      emergency_contact_name: 'Hasan Al-Jowder (Father)',
      emergency_contact_phone: '+973 3933 7744',
      photo_base64: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      allergies: 'None',
      medical_alerts: 'None',
      home_branch_id: 'branch-muh',
      created_at_branch_id: 'branch-muh',
      source: 'CARD_READER',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'pat-muh-2',
      file_number: 'ARB-MUH-26-0002',
      cpr_number: '891256782',
      full_name_en: 'Latifa Ebrahim Al-Sada',
      full_name_ar: 'لطيفة إبراهيم السادة',
      phone: '+973 3611 4455',
      email: 'latifa.sada@example.com',
      dob: '1989-12-05',
      gender: 'FEMALE',
      nationality: 'Bahraini',
      blood_group: 'B-',
      address: 'Road 114, Busaiteen, Muharraq',
      emergency_contact_name: 'Ebrahim Al-Sada (Father)',
      emergency_contact_phone: '+973 3622 9988',
      photo_base64: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      allergies: 'Ibuprofen',
      medical_alerts: 'None',
      home_branch_id: 'branch-muh',
      created_at_branch_id: 'branch-muh',
      source: 'CARD_READER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  // 7. Seed Appointments strictly tagged to branches for Today
  await db.appointments.bulkPut([
    // Manama Appointments
    {
      id: 'app-mnm-1',
      patient_id: 'pat-mnm-1',
      doctor_id: 'doc-mnm-1', // Dr. Salman (Implantologist, Chair 1)
      service_id: 'srv-6', // Implant Placement
      branch_id: 'branch-mnm',
      appointment_date: today,
      start_time: '09:30',
      end_time: '11:00',
      slot_count: 3,
      duration_mins: 90,
      status: 'IN_CHAIR',
      chief_complaint: 'Lower molar implant fixture surgery stage 1.',
      notes: 'Implants placed on site #46. 3D CBCT verification completed.',
      estimated_fee: 280.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'app-mnm-2',
      patient_id: 'pat-mnm-2',
      doctor_id: 'doc-mnm-2', // Dr. Sarah (Ortho, Chair 2)
      service_id: 'srv-9', // Ortho wire
      branch_id: 'branch-mnm',
      appointment_date: today,
      start_time: '10:00',
      end_time: '10:30',
      slot_count: 1,
      duration_mins: 30,
      status: 'CHECKED_IN',
      chief_complaint: 'Monthly braces tightening and upper archwire check.',
      notes: 'Upper premolar gap closing well. Placed new elastomeric ties.',
      estimated_fee: 25.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'app-mnm-3',
      patient_id: 'pat-mnm-1',
      doctor_id: 'doc-mnm-2', // Dr. Sarah (Ortho)
      service_id: 'srv-1', // Exam
      branch_id: 'branch-mnm',
      appointment_date: today,
      start_time: '14:30',
      end_time: '15:00',
      slot_count: 1,
      duration_mins: 30,
      status: 'CONFIRMED',
      chief_complaint: 'Post-adjustment follow up.',
      notes: 'Check bite alignment.',
      estimated_fee: 15.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Riffa Appointments
    {
      id: 'app-rfa-1',
      patient_id: 'pat-rfa-1',
      doctor_id: 'doc-rfa-1', // Dr. Noor (Endodontist, Chair 1)
      service_id: 'srv-3', // RCT
      branch_id: 'branch-rfa',
      appointment_date: today,
      start_time: '09:30',
      end_time: '10:30',
      slot_count: 2,
      duration_mins: 60,
      status: 'CONFIRMED',
      chief_complaint: 'Severe throbbing nocturnal pain in upper left premolar.',
      notes: 'Tooth #24 acute irreversible pulpitis. Canal shaping under rubber dam.',
      estimated_fee: 65.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'app-rfa-2',
      patient_id: 'pat-rfa-2',
      doctor_id: 'doc-rfa-2', // Dr. Tariq (Restorative, Chair 2)
      service_id: 'srv-4', // Filling
      branch_id: 'branch-rfa',
      appointment_date: today,
      start_time: '11:00',
      end_time: '11:30',
      slot_count: 1,
      duration_mins: 30,
      status: 'CHECKED_IN',
      chief_complaint: 'Composite aesthetic restoration on chipped incisor.',
      notes: 'Class IV aesthetic restoration with layered shade A2/A1.',
      estimated_fee: 20.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Seef Appointments
    {
      id: 'app-sef-1',
      patient_id: 'pat-sef-1',
      doctor_id: 'doc-sef-1', // Dr. Reem (Cosmetics, Chair 1)
      service_id: 'srv-7', // Whitening
      branch_id: 'branch-sef',
      appointment_date: today,
      start_time: '10:30',
      end_time: '11:30',
      slot_count: 2,
      duration_mins: 60,
      status: 'IN_CHAIR',
      chief_complaint: 'In-office Zoom Laser Teeth Whitening session.',
      notes: 'Bleaching gel 25% with LED accelerator. Initial shade A3 -> achieved A1.',
      estimated_fee: 85.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'app-sef-2',
      patient_id: 'pat-sef-2',
      doctor_id: 'doc-sef-2', // Dr. Adel (Periodontics, Chair 2)
      service_id: 'srv-2', // Deep Cleaning
      branch_id: 'branch-sef',
      appointment_date: today,
      start_time: '14:00',
      end_time: '14:30',
      slot_count: 1,
      duration_mins: 30,
      status: 'CONFIRMED',
      chief_complaint: 'Subgingival scaling and root planing for gum bleeding.',
      notes: 'Periodontal pocket depth reduced. Irrigation with chlorhexidine.',
      estimated_fee: 25.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Muharraq Appointments
    {
      id: 'app-muh-1',
      patient_id: 'pat-muh-1',
      doctor_id: 'doc-muh-1', // Dr. Layla (Pediatric, Chair 1)
      service_id: 'srv-1', // Exam
      branch_id: 'branch-muh',
      appointment_date: today,
      start_time: '09:00',
      end_time: '09:30',
      slot_count: 1,
      duration_mins: 30,
      status: 'CONFIRMED',
      chief_complaint: 'Routine preventive pediatric dental screening & fluoride.',
      notes: 'Caries free, oral hygiene instruction given to patient.',
      estimated_fee: 15.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'app-muh-2',
      patient_id: 'pat-muh-2',
      doctor_id: 'doc-muh-2', // Dr. Hamad (Oral Surgery, Chair 2)
      service_id: 'srv-5', // Extraction
      branch_id: 'branch-muh',
      appointment_date: today,
      start_time: '11:00',
      end_time: '12:00',
      slot_count: 2,
      duration_mins: 60,
      status: 'SCHEDULED',
      chief_complaint: 'Surgical extraction of lower wisdom tooth.',
      notes: 'Impacted tooth #38 with recurrent pericoronitis.',
      estimated_fee: 45.000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  // 8. Seed Default Clinic Settings
  await db.settings.put({
    id: 'clinic_settings',
    clinic_name: 'Al Rabeesh Dental Specialty Center',
    clinic_tagline: 'Excellence in Multi-Branch Dental Care & Aesthetic Dentistry',
    default_branch_id: 'branch-mnm',
    theme: 'light',
    timezone: 'Asia/Bahrain',
    date_format: 'DD/MM/YYYY',
    currency_code: 'BHD',
    currency_symbol: 'BD',
    currency_decimals: 3,
    clinic_open_time: '09:00',
    clinic_close_time: '17:30',
    slot_interval_mins: 30,
    break_enabled: true,
    break_start_time: '13:00',
    break_end_time: '14:00',
    break_label: 'Lunch & Sanitization Break',
    reader_ws_url: 'ws://localhost:5060/SCardRead',
    reader_rest_url: 'http://localhost:5050/api/operation/ReadCard',
    clinic_phone: '+973 1722 3344',
    clinic_address: 'Road 3801, Block 338, Manama Center, Kingdom of Bahrain',
    updated_at: new Date().toISOString()
  });
}

// Initial DB check on startup
export async function initializeDatabase() {
  const branchCount = await db.branches.count();
  if (branchCount === 0) {
    await seedFreshMultiBranchData();
  }
}
