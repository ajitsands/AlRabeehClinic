import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { syncEngine } from '../../services/syncEngine';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Search, 
  CreditCard, 
  Plus, 
  Phone, 
  Calendar, 
  Activity, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Upload, 
  User, 
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ExternalLink,
  Trash2,
  Lock,
  ShieldCheck,
  Edit3
} from 'lucide-react';

export default function PatientListAndRegistration({ isRegisterModalOpen, setIsRegisterModalOpen, onSelectPatient }) {
  const { 
    formatDate, 
    showToast, 
    triggerSmartCardRead, 
    lastScannedCard, 
    setLastScannedCard,
    activeBranchId,
    activeBranch,
    branches,
    generateBranchFileNumber,
    isSuperAdmin
  } = useApp();

  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [isReadingCard, setIsReadingCard] = useState(false);

  // Super Admin Delete Patient State
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);

  // Form State for Patient Registration
  const [formHomeBranchId, setFormHomeBranchId] = useState(activeBranchId || 'branch-mnm');
  const [formFileNumber, setFormFileNumber] = useState('');
  const [formCpr, setFormCpr] = useState('');
  const [formCprExpiry, setFormCprExpiry] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formGender, setFormGender] = useState('MALE');
  const [formNationality, setFormNationality] = useState('Bahraini');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formAddress, setFormAddress] = useState('');
  const [formEmergencyName, setFormEmergencyName] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formAllergies, setFormAllergies] = useState('');
  const [formMedicalAlerts, setFormMedicalAlerts] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formSource, setFormSource] = useState('MANUAL');

  // Load Patients
  const loadPatients = async () => {
    const list = await db.patients.reverse().toArray();
    setPatients(list);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Real-time CPR duplicate detector
  const duplicateCprPatient = useMemo(() => {
    if (!formCpr || !formCpr.trim()) return null;
    const clean = formCpr.trim().replace(/[\s-]+/g, '');
    if (clean.length < 3) return null;
    return patients.find(p => p.cpr_number && p.cpr_number.toString().trim().replace(/[\s-]+/g, '') === clean) || null;
  }, [formCpr, patients]);

  // Real-time CPR Card Expiry Detector
  const isCprExpired = useMemo(() => {
    if (!formCprExpiry || !formCprExpiry.trim()) return false;
    try {
      const today = new Date().toISOString().slice(0, 10);
      return formCprExpiry.trim() < today;
    } catch {
      return false;
    }
  }, [formCprExpiry]);

  // Update target branch when branch dropdown changes in form
  const handleBranchChangeInForm = (targetBranchId) => {
    setFormHomeBranchId(targetBranchId);
  };

  // Open modal & reset or fill
  const handleOpenRegisterModal = (initialData = null) => {
    const branchToUse = activeBranchId || 'branch-mnm';
    setFormHomeBranchId(branchToUse);

    if (initialData) {
      populateFormWithCardData(initialData);
    } else {
      resetForm(branchToUse);
    }
    setIsRegisterModalOpen(true);
  };

  const resetForm = (branchId = activeBranchId) => {
    setFormHomeBranchId(branchId);
    setFormCpr('');
    setFormCprExpiry('');
    setFormNameEn('');
    setFormNameAr('');
    setFormPhone('');
    setFormEmail('');
    setFormDob('');
    setFormGender('MALE');
    setFormNationality('');
    setFormBloodGroup('O+');
    setFormAddress('');
    setFormEmergencyName('');
    setFormEmergencyPhone('');
    setFormAllergies('');
    setFormMedicalAlerts('');
    setFormPhoto('');
    setFormSource('MANUAL');
  };

  // Open Edit Modal directly from patient directory card
  const handleOpenEditModal = (patient) => {
    if (!patient) return;
    setFormHomeBranchId(patient.home_branch_id || activeBranchId || 'branch-mnm');
    setFormCpr(patient.cpr_number || '');
    setFormCprExpiry(patient.cpr_expiry || '');
    setFormNameEn(patient.full_name_en || '');
    setFormNameAr(patient.full_name_ar || '');
    setFormPhone(patient.phone || '');
    setFormEmail(patient.email || '');
    setFormDob(patient.dob || '');
    setFormGender(patient.gender || 'MALE');
    setFormNationality(patient.nationality || '');
    setFormBloodGroup(patient.blood_group || 'O+');
    setFormAddress(patient.address || '');
    setFormEmergencyName(patient.emergency_contact_name || '');
    setFormEmergencyPhone(patient.emergency_contact_phone || '');
    setFormAllergies(patient.allergies || '');
    setFormMedicalAlerts(patient.medical_alerts || '');
    setFormPhoto(patient.photo_base64 || '');
    setFormSource(patient.source || 'MANUAL');
    setIsRegisterModalOpen(true);
  };

  const populateFormWithCardData = (card) => {
    if (!card) return;
    const cleanCpr = card.cpr_number ? card.cpr_number.toString().trim().replace(/[\s-]+/g, '') : '';
    const expiry = card.card_expiry || card.cpr_expiry || '';

    // Check if patient with this CPR already exists in clinic database
    const existing = cleanCpr ? patients.find(p => p.cpr_number && p.cpr_number.toString().trim().replace(/[\s-]+/g, '') === cleanCpr) : null;

    if (existing) {
      // Existing patient record: Lock CPR & Names to preserve identity, populate other fields for user review/update
      setFormCpr(existing.cpr_number);
      setFormNameEn(existing.full_name_en);
      setFormNameAr(existing.full_name_ar || card.full_name_ar || '');
      setFormHomeBranchId(existing.home_branch_id || activeBranchId || 'branch-mnm');
      
      // Update other fields from scanned card if available, otherwise keep existing values
      setFormCprExpiry(expiry || existing.cpr_expiry || '');
      setFormDob(card.dob || existing.dob || '');
      setFormGender(card.gender || existing.gender || 'MALE');
      setFormNationality(card.nationality || existing.nationality || '');
      setFormBloodGroup(card.blood_group || existing.blood_group || 'O+');
      setFormAddress(card.address || existing.address || '');
      setFormPhone(card.phone || existing.phone || '');
      setFormEmail(card.email || existing.email || '');
      setFormPhoto(card.photo_base64 || existing.photo_base64 || '');
      setFormEmergencyName(existing.emergency_contact_name || '');
      setFormEmergencyPhone(existing.emergency_contact_phone || '');
      setFormAllergies(existing.allergies || '');
      setFormMedicalAlerts(existing.medical_alerts || '');
      setFormSource(card.source || 'CARD_READER');

      showToast(`ℹ️ Existing Record Found: "${existing.full_name_en}" (File: ${existing.file_number}). CPR & Names are locked — you can update other information.`, 'info', 7000);
    } else {
      // New Patient
      setFormCpr(cleanCpr);
      setFormCprExpiry(expiry);
      setFormNameEn(card.full_name_en || '');
      setFormNameAr(card.full_name_ar || '');
      setFormDob(card.dob || '');
      setFormGender(card.gender || 'MALE');
      setFormNationality(card.nationality || '');
      setFormBloodGroup(card.blood_group || 'O+');
      setFormAddress(card.address || '');
      setFormPhoto(card.photo_base64 || '');
      setFormSource(card.source || 'CARD_READER');
      if (card.phone) setFormPhone(card.phone);
      if (card.email) setFormEmail(card.email);
    }

    if (expiry) {
      const today = new Date().toISOString().slice(0, 10);
      if (expiry < today) {
        showToast(`⚠️ CPR Card is EXPIRED (Expiry Date: ${formatDate(expiry)})`, 'error', 7000);
      } else {
        showToast(`✅ CPR Card is VALID (Expiry Date: ${formatDate(expiry)})`, 'success', 5000);
      }
    }
  };

  // When a card was scanned globally, open the form with it
  useEffect(() => {
    if (lastScannedCard) {
      handleOpenRegisterModal(lastScannedCard);
      setLastScannedCard(null);
    }
  }, [lastScannedCard]);

  // Read Card directly inside the modal with Standard vs New Card support
  const handleScanCardInModal = async (isSim = false, preset = 0, cardType = 'standard') => {
    setIsReadingCard(true);
    try {
      if (isSim) {
        // User explicitly clicked the Simulator button
        const simCard = await triggerSmartCardRead(true, preset);
        populateFormWithCardData(simCard);
        showToast('Simulated CPR Card data loaded.', 'info');
        return;
      }

      if (cardType === 'new_bahrain') {
        showToast('Reading New Issue Bahrain Smart Card (Chip on Back)...', 'info', 3000);
      } else {
        showToast('Reading Smart Card from connected reader...', 'info', 3000);
      }

      const card = await triggerSmartCardRead(false, 0, cardType);
      if (!card || (!card.cpr_number && !card.full_name_en)) {
        throw new Error('No data detected on inserted card. Please check card insertion and orientation.');
      }

      populateFormWithCardData(card);
      showToast('Smart Card data extracted successfully!', 'success');
    } catch (err) {
      console.error('Smart card reader error:', err);
      // STOP and show Card Reading Error message - DO NOT fall back to simulator
      showToast(err.message || 'Card Reading Error: Unable to read smart card. Please ensure card is inserted properly.', 'error', 7000);
    } finally {
      setIsReadingCard(false);
    }
  };

  // Save or Update Patient Record with CPR Protection
  const handleSavePatient = async (e) => {
    e.preventDefault();
    if (!formNameEn || !formPhone) {
      showToast('Please fill in Patient Name and Mobile Number', 'error');
      return;
    }

    // UPDATE FLOW: If patient with this CPR already exists in clinic records
    if (duplicateCprPatient) {
      const updatedPatient = {
        ...duplicateCprPatient,
        cpr_expiry: formCprExpiry || null,
        phone: formPhone.trim(),
        email: formEmail ? formEmail.trim() : null,
        dob: formDob || null,
        gender: formGender,
        nationality: formNationality ? formNationality.trim() : null,
        blood_group: formBloodGroup,
        address: formAddress ? formAddress.trim() : '',
        emergency_contact_name: formEmergencyName ? formEmergencyName.trim() : '',
        emergency_contact_phone: formEmergencyPhone ? formEmergencyPhone.trim() : '',
        photo_base64: formPhoto || duplicateCprPatient.photo_base64 || null,
        allergies: formAllergies ? formAllergies.trim() : '',
        medical_alerts: formMedicalAlerts ? formMedicalAlerts.trim() : '',
        source: formSource || duplicateCprPatient.source || 'CARD_READER',
        updated_at: new Date().toISOString()
      };

      await db.patients.update(duplicateCprPatient.id, updatedPatient);
      await syncEngine.queueChange('patients', duplicateCprPatient.id, 'UPDATE', updatedPatient);

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showToast(`Patient record "${duplicateCprPatient.full_name_en}" (${duplicateCprPatient.file_number}) updated successfully!`, 'success', 5000);
      setIsRegisterModalOpen(false);
      loadPatients();
      return;
    }

    // REGISTRATION FLOW: Concurrency-Safe File Number Generation
    const targetBranch = formHomeBranchId || activeBranchId;
    let finalFileNumber = await generateBranchFileNumber(targetBranch);

    // Double check against db.patients to guarantee uniqueness even under high concurrent registrations
    const existingFile = await db.patients.where('file_number').equals(finalFileNumber).first();
    if (existingFile) {
      finalFileNumber = await generateBranchFileNumber(targetBranch);
    }

    const cleanCpr = formCpr && formCpr.trim() ? formCpr.trim().replace(/[\s-]+/g, '') : null;

    const newPatient = {
      id: `pat-${Date.now()}`,
      file_number: finalFileNumber,
      cpr_number: cleanCpr,
      cpr_expiry: formCprExpiry || null,
      full_name_en: formNameEn.trim(),
      full_name_ar: formNameAr ? formNameAr.trim() : null,
      phone: formPhone.trim(),
      email: formEmail ? formEmail.trim() : null,
      dob: formDob || null,
      gender: formGender,
      nationality: formNationality,
      blood_group: formBloodGroup,
      address: formAddress,
      emergency_contact_name: formEmergencyName,
      emergency_contact_phone: formEmergencyPhone,
      photo_base64: formPhoto || null,
      allergies: formAllergies,
      medical_alerts: formMedicalAlerts,
      home_branch_id: targetBranch,
      created_at_branch_id: activeBranchId,
      source: formSource,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.patients.add(newPatient);
    await syncEngine.queueChange('patients', newPatient.id, 'INSERT', newPatient);

    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    showToast(`Patient registered successfully! Assigned File ID: ${finalFileNumber}`, 'success', 5000);
    setIsRegisterModalOpen(false);
    loadPatients();
  };

  // Super Admin Cascade Purge: Delete Patient and ALL associated history (Appointments, Vitals, Attachments)
  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete || !isSuperAdmin) return;
    const targetId = patientToDelete.id;
    const targetName = patientToDelete.full_name_en;
    const targetFile = patientToDelete.file_number;

    setIsDeletingPatient(true);
    try {
      // 1. Delete all appointments of this patient
      const patientAppointments = await db.appointments.where('patient_id').equals(targetId).toArray();
      for (const appt of patientAppointments) {
        await db.appointments.delete(appt.id);
        await syncEngine.queueChange('appointments', appt.id, 'DELETE', { id: appt.id });
      }

      // 2. Delete all vitals records of this patient
      const patientVitals = await db.vitals.where('patient_id').equals(targetId).toArray();
      for (const v of patientVitals) {
        await db.vitals.delete(v.id);
        await syncEngine.queueChange('vitals', v.id, 'DELETE', { id: v.id });
      }

      // 3. Delete all attachments & X-Rays of this patient
      const patientAttachments = await db.attachments.where('patient_id').equals(targetId).toArray();
      for (const att of patientAttachments) {
        await db.attachments.delete(att.id);
        await syncEngine.queueChange('attachments', att.id, 'DELETE', { id: att.id });
      }

      // 4. Delete patient record
      await db.patients.delete(targetId);
      await syncEngine.queueChange('patients', targetId, 'DELETE', { id: targetId });

      showToast(`Super Admin Action: Patient "${targetName}" (${targetFile}) & all associated clinical records (appointments, vitals, attachments) have been permanently purged.`, 'info', 6000);
      setPatientToDelete(null);
      loadPatients();
    } catch (err) {
      console.error('Failed to purge patient records:', err);
      showToast('Error deleting patient records: ' + err.message, 'error');
    } finally {
      setIsDeletingPatient(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Photo size must be less than 10MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter Patients Globally or by Branch
  const filteredPatients = patients.filter(p => {
    const matchGender = filterGender === 'ALL' || p.gender === filterGender;
    if (!matchGender) return false;

    const matchBranch = filterBranch === 'ALL' || p.home_branch_id === filterBranch;
    if (!matchBranch) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.full_name_en && p.full_name_en.toLowerCase().includes(q)) ||
      (p.full_name_ar && p.full_name_ar.includes(q)) ||
      (p.cpr_number && p.cpr_number.includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.file_number && p.file_number.toLowerCase().includes(q)) ||
      (p.nationality && p.nationality.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Search Bar & Action Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Fast Global Multi-Field Search */}
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Global Search across ALL branches by CPR, Mobile, Name (Ar/En), File No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Branch Filter, Gender Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          
          {/* Branch Filter Selector */}
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🌐 All Branches ({patients.length})</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                📍 {b.name.replace('Al Rabeesh ', '')} ({patients.filter(p => p.home_branch_id === b.id).length})
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>

          <button
            onClick={() => handleOpenRegisterModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Patient Registration</span>
          </button>
        </div>

      </div>

      {/* Patients Grid / Directory - Exactly 4 Cards in One Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5">
        {filteredPatients.map((patient) => {
          const patientBranch = branches.find(b => b.id === patient.home_branch_id);
          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient.id)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Photo, Name, CPR, File Number & Branch Badge */}
                <div className="flex items-start gap-3.5 mb-3">
                  <img
                    src={patient.photo_base64 || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                    alt={patient.full_name_en}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2.5 py-1 text-xs font-black tracking-wider uppercase bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-300 dark:border-blue-700 shadow-xs">
                        {patient.file_number}
                      </span>
                      {patient.source === 'CARD_READER' && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          <CheckCircle className="w-2.5 h-2.5" /> CPR
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-1">
                      {patient.full_name_en}
                    </h3>
                    {patient.full_name_ar && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-arabic truncate">
                        {patient.full_name_ar}
                      </p>
                    )}

                    {/* Home Branch Chip */}
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: patientBranch?.color || '#3B82F6' }}
                      />
                      <span className="truncate">{patientBranch?.name?.replace('Al Rabeesh ', '') || 'Manama'}</span>
                    </div>
                  </div>
                </div>

                {/* Details Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800 my-2">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">CPR & Expiry</span>
                    <div className="flex flex-col gap-1 mt-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {patient.cpr_number || 'N/A'}
                      </span>
                      {patient.cpr_expiry ? (
                        patient.cpr_expiry < new Date().toISOString().slice(0, 10) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md shadow-2xs w-fit">
                            <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>EXPIRED: {formatDate(patient.cpr_expiry)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md shadow-2xs w-fit">
                            <CheckCircle className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>VALID: {formatDate(patient.cpr_expiry)}</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400">No Expiry Date</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Mobile Phone</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {patient.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Nationality & DOB</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {patient.nationality || '—'} {patient.dob ? `• ${formatDate(patient.dob)}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Blood Group</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {patient.blood_group || 'O+'}
                    </span>
                  </div>
                </div>

                {/* Medical Alerts / Allergies Alert */}
                {(patient.allergies || patient.medical_alerts) && (
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5 my-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span className="truncate">
                      {patient.allergies ? `Allergy: ${patient.allergies}` : patient.medical_alerts}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <span>View Full File & Clinical Vitals</span>
                  <ChevronRight className="w-4 h-4" />
                </span>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Edit Patient Details Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(patient);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1 text-[11px] transition cursor-pointer shadow-2xs border border-blue-200 dark:border-blue-800"
                    title="Edit Patient Information (Card Expiry, Mobile, Address, Medical Alerts, etc.)"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Edit</span>
                  </button>

                  {/* Super Admin Only: Delete Patient Button */}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPatientToDelete(patient);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
                      title="Super Admin Only: Delete Patient & Purge All Records"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {filteredPatients.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No patients found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new patient.</p>
          </div>
        )}
      </div>

      {/* PATIENT REGISTRATION MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              
              {/* Left: Icon, Title, Subtitle, and Registering Branch Selector right below the Title */}
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                  duplicateCprPatient
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                }`}>
                  {duplicateCprPatient ? <ShieldCheck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                        {duplicateCprPatient ? 'Update Existing Patient File' : 'Patient Registration & CPR Intake'}
                      </h3>
                      {duplicateCprPatient && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Update Mode (CPR & Names Protected)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {duplicateCprPatient
                        ? `Updating details for "${duplicateCprPatient.full_name_en}" (File: ${duplicateCprPatient.file_number})`
                        : 'Register new customer file and synchronize with clinic records'}
                    </p>
                  </div>

                  {/* Registering Branch - Positioned directly below the Title */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Registering Branch:
                    </span>
                    <select
                      value={formHomeBranchId}
                      disabled={!!duplicateCprPatient}
                      onChange={(e) => handleBranchChangeInForm(e.target.value)}
                      className={`text-xs font-bold py-1 px-3 rounded-xl border transition shadow-2xs ${
                        duplicateCprPatient
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500'
                      }`}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          📍 {b.name.replace('Al Rabeesh ', '')} ({b.prefix})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right: Auto-Assigned File ID Badge & Close Button */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {duplicateCprPatient ? 'Existing File ID' : 'Patient File ID'}
                  </span>
                  <div className={`text-xs sm:text-sm font-extrabold tracking-wide px-3.5 py-1.5 rounded-2xl border-2 shadow-2xs flex items-center gap-2 ${
                    duplicateCprPatient
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700'
                      : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 border-dashed border-blue-300 dark:border-blue-700'
                  }`}>
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>
                      {duplicateCprPatient 
                        ? `${duplicateCprPatient.file_number} (Registered Record)`
                        : `${(branches.find(b => b.id === formHomeBranchId) || activeBranch)?.prefix || 'ARB-MNM'} • Auto-Generated on Save`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

            </div>

            {/* Smart Card Quick-Autofill Banner */}
            <div className="my-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3 shrink min-w-0">
                <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Instant Smart Card Intake
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate sm:whitespace-normal">
                    Insert CPR Card into reader and click scan to autofill all personal info & photo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                <button
                  type="button"
                  onClick={() => handleScanCardInModal(false, 0, 'standard')}
                  disabled={isReadingCard}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  title="Scan Standard CPR Card (chip on front)"
                >
                  <CreditCard className={`w-3.5 h-3.5 ${isReadingCard ? 'animate-spin' : ''}`} />
                  <span>{isReadingCard ? 'Reading...' : 'Scan Standard CPR'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScanCardInModal(false, 0, 'new_bahrain')}
                  disabled={isReadingCard}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  title="Scan New Issue Bahrain Smart Card (chip on back side)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scan New Card (Back Chip)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScanCardInModal(true, 0)}
                  className="px-2.5 py-1.5 sm:py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                  title="Test using simulated card"
                >
                  Simulator
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4">
              
              {/* Photo & Names Row */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Photo */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {formPhoto ? (
                      <img src={formPhoto} alt="Patient" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <label className="cursor-pointer text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    <span>Change Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {/* Names */}
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Full Name (English) *
                      </label>
                      {duplicateCprPatient && (
                        <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                          <Lock className="w-2.5 h-2.5" /> Non-Editable (Registered Record)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      readOnly={!!duplicateCprPatient}
                      value={formNameEn}
                      onChange={(e) => setFormNameEn(e.target.value)}
                      placeholder="e.g. Mohammed Ali Al-Mahmood"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition ${
                        duplicateCprPatient
                          ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed select-none font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium'
                      }`}
                      title={duplicateCprPatient ? 'Patient Name is non-editable for existing registered record' : ''}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Full Name (Arabic)
                      </label>
                      {duplicateCprPatient && (
                        <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                          <Lock className="w-2.5 h-2.5" /> Non-Editable
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      readOnly={!!duplicateCprPatient}
                      value={formNameAr}
                      onChange={(e) => setFormNameAr(e.target.value)}
                      placeholder="e.g. محمد علي آل محمود"
                      dir="rtl"
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition font-arabic ${
                        duplicateCprPatient
                          ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed select-none font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                      title={duplicateCprPatient ? 'Patient Name is non-editable for existing registered record' : ''}
                    />
                  </div>
                </div>
              </div>

              {/* CPR, CPR Expiry & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      CPR / National ID
                    </label>
                    {duplicateCprPatient && (
                      <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    readOnly={!!duplicateCprPatient}
                    value={formCpr}
                    onChange={(e) => setFormCpr(e.target.value)}
                    placeholder="e.g. 920512348"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      duplicateCprPatient
                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 cursor-not-allowed select-none'
                        : isCprExpired
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 text-rose-900 dark:text-rose-100'
                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                    title={duplicateCprPatient ? 'CPR Number is locked to protect file identification' : ''}
                  />
                  {duplicateCprPatient && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] leading-tight flex items-start gap-2.5 shadow-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                          Existing Patient File
                        </div>
                        <div className="mt-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-mono font-bold text-xs tracking-wider border border-amber-300 dark:border-amber-700 whitespace-nowrap shadow-2xs">
                            {duplicateCprPatient.file_number}
                          </span>
                        </div>
                        <p className="mt-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                          CPR and Names are locked. You can modify card expiry, phone, address, nationality, photo & clinical alerts below, then click Update.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CPR Card Expiry Date & Expired Badge */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Card Expiry Date
                    </label>
                    {formCprExpiry && isCprExpired && (
                      <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-500" /> EXPIRED
                      </span>
                    )}
                    {formCprExpiry && !isCprExpired && (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> VALID
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={formCprExpiry}
                    onChange={(e) => setFormCprExpiry(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      isCprExpired
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : formCprExpiry
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  />
                  {formCprExpiry && isCprExpired && (
                    <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-900 flex items-center justify-between text-[11px] font-extrabold text-rose-700 dark:text-rose-300 shadow-2xs">
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Card EXPIRED on:</span>
                      <span className="font-mono">{formatDate(formCprExpiry)}</span>
                    </div>
                  )}
                  {formCprExpiry && !isCprExpired && (
                    <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-900 flex items-center justify-between text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                      <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Card VALID until:</span>
                      <span className="font-mono">{formatDate(formCprExpiry)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +973 3988 7766"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. patient@example.com"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* DOB, Gender, Nationality, Blood Group */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formNationality}
                    onChange={(e) => setFormNationality(e.target.value)}
                    placeholder="e.g. Bahraini, Indian, Filipino..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formBloodGroup}
                    onChange={(e) => setFormBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Villa 142, Road 1805, Block 214, Muharraq"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Emergency Contact Name & Relation
                  </label>
                  <input
                    type="text"
                    value={formEmergencyName}
                    onChange={(e) => setFormEmergencyName(e.target.value)}
                    placeholder="e.g. Fatima Al-Mahmood (Wife)"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Emergency Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formEmergencyPhone}
                    onChange={(e) => setFormEmergencyPhone(e.target.value)}
                    placeholder="e.g. +973 3911 2233"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Allergies & Medical Alerts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                    Known Drug & Dental Allergies
                  </label>
                  <input
                    type="text"
                    value={formAllergies}
                    onChange={(e) => setFormAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Latex, Local Anesthesia..."
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                    Medical Alerts / Chronic Illness
                  </label>
                  <input
                    type="text"
                    value={formMedicalAlerts}
                    onChange={(e) => setFormMedicalAlerts(e.target.value)}
                    placeholder="e.g. Hypertension, Diabetes, Heart condition, Blood thinners..."
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 text-white shadow-md cursor-pointer active:scale-98 ${
                    duplicateCprPatient
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                  }`}
                  title={duplicateCprPatient ? 'Save updated details for this patient file' : 'Create new patient record'}
                >
                  {duplicateCprPatient ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Update Patient Information</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Register & Create Patient File</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SUPER ADMIN CONFIRMATION MODAL: DELETE PATIENT & PURGE ALL HISTORY */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/60 animate-scaleUp">
            
            {/* Top Super Admin Privilege Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-950">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-800">
                👑 Super Admin Authorization Required
              </span>
              <button
                type="button"
                onClick={() => !isDeletingPatient && setPatientToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center my-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                <Trash2 className="w-7 h-7 animate-bounce" />
              </div>

              <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                Purge Patient & All Clinical History?
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You are about to permanently delete this patient record and all linked clinical data.
              </p>
            </div>

            {/* Target Patient Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-left my-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {patientToDelete.full_name_en}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono font-bold text-xs">
                  {patientToDelete.file_number}
                </span>
              </div>
              {patientToDelete.full_name_ar && (
                <p className="text-xs text-slate-500 font-arabic">{patientToDelete.full_name_ar}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>CPR: <strong className="text-slate-700 dark:text-slate-200">{patientToDelete.cpr_number || 'N/A'}</strong></span>
                <span>•</span>
                <span>Phone: <strong className="text-slate-700 dark:text-slate-200">{patientToDelete.phone}</strong></span>
              </div>
            </div>

            {/* Irreversible Warning Box */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-2 mb-6">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Irreversible Action:</strong> Deleting this patient will permanently purge all associated <strong>Appointments, Vitals Recordings, Dental X-Rays, Lab Reports, and Invoices</strong> across all branch locations and MySQL sync databases.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                disabled={isDeletingPatient}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePatient}
                disabled={isDeletingPatient}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingPatient ? 'Purging Records...' : 'Permanently Delete'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
