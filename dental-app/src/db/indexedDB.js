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

// Initial Seed Data
export async function initializeDatabase() {
  // 1. Seed Branches if not present
  const branchCount = await db.branches.count();
  if (branchCount === 0) {
    await db.branches.bulkPut([
      {
        id: 'branch-mnm',
        code: 'MNM',
        name: 'Manama Flagship Center',
        prefix: 'ARB-MNM',
        phone: '+973 1722 3344',
        address: 'Road 3821, Block 338, Adliya/Manama, Kingdom of Bahrain',
        color: '#2563EB', // Blue
        is_active: true
      },
      {
        id: 'branch-rfa',
        code: 'RFA',
        name: 'Riffa Specialty Clinic',
        prefix: 'ARB-RFA',
        phone: '+973 1777 8899',
        address: 'Avenue 41, Block 925, East Riffa, Kingdom of Bahrain',
        color: '#059669', // Emerald
        is_active: true
      },
      {
        id: 'branch-sef',
        code: 'SEF',
        name: 'Seef Aesthetic & Implant Center',
        prefix: 'ARB-SEF',
        phone: '+973 1758 1122',
        address: 'Seef District, Building 2140, Manama, Kingdom of Bahrain',
        color: '#7C3AED', // Purple
        is_active: true
      },
      {
        id: 'branch-muh',
        code: 'MUH',
        name: 'Muharraq Family Dental',
        prefix: 'ARB-MUH',
        phone: '+973 1733 4455',
        address: 'Airport Avenue, Block 211, Muharraq, Kingdom of Bahrain',
        color: '#D97706', // Amber
        is_active: true
      }
    ]);
  }

  // 2. Seed Users & Staff Roles
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkPut([
      {
        id: 'user-superadmin',
        username: 'superadmin',
        full_name: 'Dr. Tariq Al Rabeesh (HQ Owner)',
        role: 'SUPER_ADMIN',
        branch_id: null,
        email: 'superadmin@alrabeeshdental.com',
        phone: '+973 3900 0000',
        is_active: true
      },
      {
        id: 'user-admin-mnm',
        username: 'admin_manama',
        full_name: 'Hassan Al-Mahmood (Manama Admin)',
        role: 'BRANCH_ADMIN',
        branch_id: 'branch-mnm',
        email: 'manama.admin@alrabeeshdental.com',
        phone: '+973 3911 1111',
        is_active: true
      },
      {
        id: 'user-admin-rfa',
        username: 'admin_riffa',
        full_name: 'Maryam Al-Doseri (Riffa Admin)',
        role: 'BRANCH_ADMIN',
        branch_id: 'branch-rfa',
        email: 'riffa.admin@alrabeeshdental.com',
        phone: '+973 3922 2222',
        is_active: true
      },
      {
        id: 'user-admin-sef',
        username: 'admin_seef',
        full_name: 'Zainab Bucheeri (Seef Admin)',
        role: 'BRANCH_ADMIN',
        branch_id: 'branch-sef',
        email: 'seef.admin@alrabeeshdental.com',
        phone: '+973 3933 3333',
        is_active: true
      },
      {
        id: 'user-admin-muh',
        username: 'admin_muharraq',
        full_name: 'Jasim Al-Jowder (Muharraq Admin)',
        role: 'BRANCH_ADMIN',
        branch_id: 'branch-muh',
        email: 'muharraq.admin@alrabeeshdental.com',
        phone: '+973 3944 4444',
        is_active: true
      },
      {
        id: 'user-rec-mnm',
        username: 'reception_manama',
        full_name: 'Fatima Reception (Manama)',
        role: 'RECEPTIONIST',
        branch_id: 'branch-mnm',
        email: 'reception.mnm@alrabeeshdental.com',
        phone: '+973 1722 3344',
        is_active: true
      },
      {
        id: 'user-rec-rfa',
        username: 'reception_riffa',
        full_name: 'Layla Reception (Riffa)',
        role: 'RECEPTIONIST',
        branch_id: 'branch-rfa',
        email: 'reception.rfa@alrabeeshdental.com',
        phone: '+973 1777 8899',
        is_active: true
      },
      {
        id: 'user-rec-sef',
        username: 'reception_seef',
        full_name: 'Sarah Reception (Seef)',
        role: 'RECEPTIONIST',
        branch_id: 'branch-sef',
        email: 'reception.sef@alrabeeshdental.com',
        phone: '+973 1758 1122',
        is_active: true
      },
      {
        id: 'user-rec-muh',
        username: 'reception_muharraq',
        full_name: 'Noor Reception (Muharraq)',
        role: 'RECEPTIONIST',
        branch_id: 'branch-muh',
        email: 'reception.muh@alrabeeshdental.com',
        phone: '+973 1733 4455',
        is_active: true
      },
      {
        id: 'user-doc-tariq',
        username: 'dr_tariq',
        full_name: 'Dr. Tariq Al-Mansoor',
        role: 'DOCTOR',
        branch_id: 'branch-mnm',
        email: 'dr.tariq@alrabeeshdental.com',
        phone: '+973 3912 3456',
        is_active: true
      },
      {
        id: 'user-doc-faisal',
        username: 'dr_faisal',
        full_name: 'Dr. Faisal Al-Hassan',
        role: 'DOCTOR',
        branch_id: 'branch-rfa',
        email: 'dr.faisal@alrabeeshdental.com',
        phone: '+973 3934 5678',
        is_active: true
      },
      {
        id: 'user-doc-ahmed',
        username: 'dr_ahmed',
        full_name: 'Dr. Ahmed Bucheeri',
        role: 'DOCTOR',
        branch_id: 'branch-sef',
        email: 'dr.ahmed@alrabeeshdental.com',
        phone: '+973 3956 7890',
        is_active: true
      },
      {
        id: 'user-doc-priya',
        username: 'dr_priya',
        full_name: 'Dr. Priya Sharma',
        role: 'DOCTOR',
        branch_id: 'branch-muh',
        email: 'dr.priya@alrabeeshdental.com',
        phone: '+973 3945 6789',
        is_active: true
      }
    ]);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    // 3. Seed Settings with Active Branch
    await db.settings.put({
      id: 'clinic_settings',
      clinic_name: 'Al Rabeesh Dental Specialty Center',
      clinic_tagline: 'Excellence in Dental Care & Aesthetic Dentistry',
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
      clinic_address: 'Road 3821, Block 338, Manama, Kingdom of Bahrain',
      updated_at: new Date().toISOString()
    });

    // 4. Seed 8 Clinic Doctors (2 per branch across Manama, Riffa, Seef, Muharraq)
    await db.doctors.bulkPut([
      // Manama Branch Doctors
      {
        id: 'doc-mnm-1',
        name: 'Dr. Tariq Al-Mansoor',
        specialty: 'Senior Consultant Orthodontist',
        qualification: 'BDS, MSc Orthodontics (UK)',
        room_number: 'Room 101',
        chair_number: 'Manama Chair 1',
        primary_branch_id: 'branch-mnm',
        branches_assigned: ['branch-mnm'],
        phone: '+973 3912 3456',
        email: 'dr.tariq@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
        color_tag: '#2563EB', // Blue
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },
      {
        id: 'doc-mnm-2',
        name: 'Dr. Sarah Jenkins',
        specialty: 'Endodontist & Root Canal Specialist',
        qualification: 'DDS, Endodontics Board Certified',
        room_number: 'Room 102',
        chair_number: 'Manama Chair 2',
        primary_branch_id: 'branch-mnm',
        branches_assigned: ['branch-mnm'],
        phone: '+973 3923 4567',
        email: 'dr.sarah@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1594824813598-a1c6a6f65152?w=200&auto=format&fit=crop&q=80',
        color_tag: '#059669', // Emerald
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },

      // Riffa Branch Doctors
      {
        id: 'doc-rfa-1',
        name: 'Dr. Faisal Al-Hassan',
        specialty: 'Oral & Maxillofacial Surgeon',
        qualification: 'BDS, FRCS (Ireland), Implantology',
        room_number: 'Room 201',
        chair_number: 'Riffa Chair 1 (Surgical)',
        primary_branch_id: 'branch-rfa',
        branches_assigned: ['branch-rfa'],
        phone: '+973 3934 5678',
        email: 'dr.faisal@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
        color_tag: '#059669', // Emerald
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },
      {
        id: 'doc-rfa-2',
        name: 'Dr. Reem Al-Doseri',
        specialty: 'Restorative & Aesthetic Dentist',
        qualification: 'BDS, Restorative Master (Cairo)',
        room_number: 'Room 202',
        chair_number: 'Riffa Chair 2',
        primary_branch_id: 'branch-rfa',
        branches_assigned: ['branch-rfa'],
        phone: '+973 3967 8901',
        email: 'dr.reem@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
        color_tag: '#10B981', // Teal
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },

      // Seef Branch Doctors
      {
        id: 'doc-sef-1',
        name: 'Dr. Ahmed Bucheeri',
        specialty: 'Cosmetic Dentist & Smile Designer',
        qualification: 'BDS, Cosmetic Fellow (USA)',
        room_number: 'Room 301',
        chair_number: 'Seef Chair 1 (VIP)',
        primary_branch_id: 'branch-sef',
        branches_assigned: ['branch-sef'],
        phone: '+973 3956 7890',
        email: 'dr.ahmed@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80',
        color_tag: '#7C3AED', // Purple
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },
      {
        id: 'doc-sef-2',
        name: 'Dr. Layla Al-Mahroos',
        specialty: 'Prosthodontist & Crown Specialist',
        qualification: 'MDS Prosthodontics (UK)',
        room_number: 'Room 302',
        chair_number: 'Seef Chair 2',
        primary_branch_id: 'branch-sef',
        branches_assigned: ['branch-sef'],
        phone: '+973 3978 9012',
        email: 'dr.layla@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1594824813585-802526e033d5?w=200&auto=format&fit=crop&q=80',
        color_tag: '#DB2777', // Pink
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },

      // Muharraq Branch Doctors
      {
        id: 'doc-muh-1',
        name: 'Dr. Priya Sharma',
        specialty: 'Pediatric & Preventive Dentist',
        qualification: 'MDS Pediatric Dentistry',
        room_number: 'Room 401',
        chair_number: 'Muharraq Chair 1 (Kids)',
        primary_branch_id: 'branch-muh',
        branches_assigned: ['branch-muh'],
        phone: '+973 3945 6789',
        email: 'dr.priya@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
        color_tag: '#D97706', // Amber
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      },
      {
        id: 'doc-muh-2',
        name: 'Dr. Khalid Al-Jowder',
        specialty: 'General Dental Surgeon & Laser Specialist',
        qualification: 'BDS, Laser Dentistry Fellow',
        room_number: 'Room 402',
        chair_number: 'Muharraq Chair 2',
        primary_branch_id: 'branch-muh',
        branches_assigned: ['branch-muh'],
        phone: '+973 3989 0123',
        email: 'dr.khalid@alrabeeshdental.com',
        photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
        color_tag: '#EA580C', // Orange
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_mins: 30,
        is_active: true
      }
    ]);

    // 5. Seed Dental Services
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
        name: 'Scaling, Polishing & Deep Cleaning',
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
        name: 'Surgical Tooth / Molar Extraction',
        category: 'Oral Surgery',
        default_duration_mins: 60,
        required_slots: 2,
        price: 45.000,
        description: 'Complex or wisdom tooth extraction with local anesthesia and suture.',
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
        name: 'In-Office Laser Teeth Whitening (Zoom / Beyond)',
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

    // 6. Seed Initial Sample Patients with Smart Branch-Prefixed File Numbers
    await db.patients.bulkPut([
      {
        id: 'pat-1',
        file_number: 'ARB-MNM-26-0001',
        cpr_number: '920512348',
        full_name_en: 'Mohammed Ali Al-Mahmood',
        full_name_ar: 'محمد علي آل محمود',
        phone: '+973 3988 7766',
        email: 'm.mahmood@example.com',
        dob: '1992-05-12',
        gender: 'MALE',
        nationality: 'Bahraini',
        blood_group: 'O+',
        address: 'Villa 142, Road 1805, Busaiteen, Muharraq',
        emergency_contact_name: 'Fatima Al-Mahmood (Wife)',
        emergency_contact_phone: '+973 3911 2233',
        photo_base64: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        allergies: 'Penicillin, Latex',
        medical_alerts: 'Hypertension (Controlled with medication)',
        home_branch_id: 'branch-mnm',
        created_at_branch_id: 'branch-mnm',
        source: 'CARD_READER',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'pat-2',
        file_number: 'ARB-RFA-26-0002',
        cpr_number: '880319452',
        full_name_en: 'Noor Khalid Al-Kaabi',
        full_name_ar: 'نور خالد الكعبي',
        phone: '+973 3655 4433',
        email: 'noor.kaabi@example.com',
        dob: '1988-03-19',
        gender: 'FEMALE',
        nationality: 'Bahraini',
        blood_group: 'A+',
        address: 'Building 450, Apt 12, Riffa Views, Riffa',
        emergency_contact_name: 'Khalid Al-Kaabi (Father)',
        emergency_contact_phone: '+973 3322 1100',
        photo_base64: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        allergies: 'None',
        medical_alerts: 'None',
        home_branch_id: 'branch-rfa',
        created_at_branch_id: 'branch-rfa',
        source: 'CARD_READER',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'pat-3',
        file_number: 'ARB-SEF-26-0003',
        cpr_number: '951104889',
        full_name_en: 'Rahul Rajesh Menon',
        full_name_ar: 'راهول راجيش مينون',
        phone: '+973 3409 8877',
        email: 'rahul.menon@example.com',
        dob: '1995-11-04',
        gender: 'MALE',
        nationality: 'Indian',
        blood_group: 'B+',
        address: 'Flat 304, Juffair Boulevard, Manama',
        emergency_contact_name: 'Anjali Menon (Sister)',
        emergency_contact_phone: '+973 3455 6677',
        photo_base64: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        allergies: 'Sulfa Drugs',
        medical_alerts: 'Mild Asthma',
        home_branch_id: 'branch-sef',
        created_at_branch_id: 'branch-sef',
        source: 'CARD_READER',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'pat-4',
        file_number: 'ARB-MUH-26-0004',
        cpr_number: '990214811',
        full_name_en: 'Yousif Ebrahim Al-Buflasa',
        full_name_ar: 'يوسف إبراهيم البوفلاسة',
        phone: '+973 3918 2736',
        email: 'yousif.b@example.com',
        dob: '1999-02-14',
        gender: 'MALE',
        nationality: 'Bahraini',
        blood_group: 'AB+',
        address: 'House 88, Road 2101, Busaiteen, Muharraq',
        emergency_contact_name: 'Ebrahim Al-Buflasa (Father)',
        emergency_contact_phone: '+973 3922 8844',
        photo_base64: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        allergies: 'None',
        medical_alerts: 'None',
        home_branch_id: 'branch-muh',
        created_at_branch_id: 'branch-muh',
        source: 'CARD_READER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);

    // 7. Seed Sample Appointments across All 4 Branches for Today
    const today = new Date().toISOString().split('T')[0];
    await db.appointments.bulkPut([
      // Manama Appointments
      {
        id: 'app-mnm-1',
        patient_id: 'pat-1',
        doctor_id: 'doc-mnm-2', // Dr. Sarah (Root Canal)
        service_id: 'srv-3',
        branch_id: 'branch-mnm',
        appointment_date: today,
        start_time: '09:30',
        end_time: '10:30',
        slot_count: 2,
        duration_mins: 60,
        status: 'CONFIRMED',
        chief_complaint: 'Severe throbbing pain in lower right tooth on cold food.',
        notes: 'Tooth #46 deep decay approaching pulp.',
        estimated_fee: 65.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'app-mnm-2',
        patient_id: 'pat-2',
        doctor_id: 'doc-mnm-1', // Dr. Tariq (Orthodontist)
        service_id: 'srv-9',
        branch_id: 'branch-mnm',
        appointment_date: today,
        start_time: '10:00',
        end_time: '10:30',
        slot_count: 1,
        duration_mins: 30,
        status: 'CHECKED_IN',
        chief_complaint: 'Monthly braces tightening and upper archwire check.',
        notes: 'Upper premolar gap closing well.',
        estimated_fee: 25.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Riffa Appointments
      {
        id: 'app-rfa-1',
        patient_id: 'pat-2',
        doctor_id: 'doc-rfa-1', // Dr. Faisal (Oral Surgeon)
        service_id: 'srv-5', // Extraction
        branch_id: 'branch-rfa',
        appointment_date: today,
        start_time: '11:00',
        end_time: '12:00',
        slot_count: 2,
        duration_mins: 60,
        status: 'CONFIRMED',
        chief_complaint: 'Wisdom tooth extraction lower left jaw.',
        notes: 'Impacted wisdom tooth #38.',
        estimated_fee: 45.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'app-rfa-2',
        patient_id: 'pat-1',
        doctor_id: 'doc-rfa-2', // Dr. Reem (Restorative)
        service_id: 'srv-2', // Scaling
        branch_id: 'branch-rfa',
        appointment_date: today,
        start_time: '14:30',
        end_time: '15:00',
        slot_count: 1,
        duration_mins: 30,
        status: 'SCHEDULED',
        chief_complaint: 'Routine dental scaling and cleaning.',
        notes: 'Annual hygiene recall.',
        estimated_fee: 25.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Seef Appointments
      {
        id: 'app-sef-1',
        patient_id: 'pat-3',
        doctor_id: 'doc-sef-1', // Dr. Ahmed (Cosmetic)
        service_id: 'srv-7', // Whitening
        branch_id: 'branch-sef',
        appointment_date: today,
        start_time: '11:00',
        end_time: '12:00',
        slot_count: 2,
        duration_mins: 60,
        status: 'IN_CHAIR',
        chief_complaint: 'In-office Zoom laser teeth whitening.',
        notes: 'Shade guide A3 target A1.',
        estimated_fee: 85.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Muharraq Appointments
      {
        id: 'app-muh-1',
        patient_id: 'pat-4',
        doctor_id: 'doc-muh-1', // Dr. Priya (Pediatric)
        service_id: 'srv-1', // Exam
        branch_id: 'branch-muh',
        appointment_date: today,
        start_time: '09:00',
        end_time: '09:30',
        slot_count: 1,
        duration_mins: 30,
        status: 'CONFIRMED',
        chief_complaint: 'Pediatric dental checkup and fluoride varnish.',
        notes: 'First visit child dental screening.',
        estimated_fee: 15.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);
  }
}
