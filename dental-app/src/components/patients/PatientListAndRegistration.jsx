import React, { useState, useEffect } from 'react';
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
  ShieldAlert
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
    generateBranchFileNumber
  } = useApp();

  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [isReadingCard, setIsReadingCard] = useState(false);

  // Form State for Patient Registration
  const [formHomeBranchId, setFormHomeBranchId] = useState(activeBranchId || 'branch-mnm');
  const [formFileNumber, setFormFileNumber] = useState('');
  const [formCpr, setFormCpr] = useState('');
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

  // Update target branch and recalculate next File ID when branch changes in form
  const handleBranchChangeInForm = async (targetBranchId) => {
    setFormHomeBranchId(targetBranchId);
    const nextId = await generateBranchFileNumber(targetBranchId);
    setFormFileNumber(nextId);
  };

  // Open modal & reset or fill
  const handleOpenRegisterModal = async (initialData = null) => {
    const branchToUse = activeBranchId || 'branch-mnm';
    setFormHomeBranchId(branchToUse);
    const nextId = await generateBranchFileNumber(branchToUse);
    setFormFileNumber(nextId);

    if (initialData) {
      populateFormWithCardData(initialData);
    } else {
      resetForm(nextId, branchToUse);
    }
    setIsRegisterModalOpen(true);
  };

  const resetForm = (fileNum, branchId = activeBranchId) => {
    setFormHomeBranchId(branchId);
    setFormFileNumber(fileNum || `ARB-MNM-${new Date().getFullYear().toString().slice(-2)}-0001`);
    setFormCpr('');
    setFormNameEn('');
    setFormNameAr('');
    setFormPhone('');
    setFormEmail('');
    setFormDob('');
    setFormGender('MALE');
    setFormNationality('Bahraini');
    setFormBloodGroup('O+');
    setFormAddress('');
    setFormEmergencyName('');
    setFormEmergencyPhone('');
    setFormAllergies('');
    setFormMedicalAlerts('');
    setFormPhoto('');
    setFormSource('MANUAL');
  };

  const populateFormWithCardData = (card) => {
    if (!card) return;
    setFormCpr(card.cpr_number || '');
    setFormNameEn(card.full_name_en || '');
    setFormNameAr(card.full_name_ar || '');
    setFormDob(card.dob || '');
    setFormGender(card.gender || 'MALE');
    setFormNationality(card.nationality || 'Bahraini');
    setFormBloodGroup(card.blood_group || 'O+');
    setFormAddress(card.address || '');
    setFormPhoto(card.photo_base64 || '');
    setFormSource(card.source || 'CARD_READER');
    if (card.phone) setFormPhone(card.phone);
    if (card.email) setFormEmail(card.email);
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
      if (cardType === 'new_bahrain') {
        showToast('Reading New Bahrain Card (Chip on Back)...', 'info', 3000);
      }
      const card = await triggerSmartCardRead(isSim, preset, cardType);
      populateFormWithCardData(card);
      showToast('Smart Card data extracted successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'No card detected in reader. Running simulator fallback...', 'warning');
      const simCard = await triggerSmartCardRead(true, 0);
      populateFormWithCardData(simCard);
    } finally {
      setIsReadingCard(false);
    }
  };

  // Save Patient
  const handleSavePatient = async (e) => {
    e.preventDefault();
    if (!formNameEn || !formPhone) {
      showToast('Please fill in Patient Name and Mobile Number', 'error');
      return;
    }

    // Check duplicate CPR if CPR provided
    if (formCpr) {
      const existing = patients.find(p => p.cpr_number === formCpr);
      if (existing) {
        showToast(`Patient with CPR ${formCpr} already exists (${existing.file_number})!`, 'error');
        return;
      }
    }

    const newPatient = {
      id: `pat-${Date.now()}`,
      file_number: formFileNumber,
      cpr_number: formCpr || null,
      full_name_en: formNameEn,
      full_name_ar: formNameAr || null,
      phone: formPhone,
      email: formEmail || null,
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
      home_branch_id: formHomeBranchId || activeBranchId,
      created_at_branch_id: activeBranchId,
      source: formSource,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.patients.add(newPatient);
    await syncEngine.queueChange('patients', newPatient.id, 'INSERT', newPatient);

    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    showToast(`Patient registered successfully! File: ${newPatient.file_number}`, 'success');
    setIsRegisterModalOpen(false);
    loadPatients();
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
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">CPR Number</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {patient.cpr_number || 'N/A'}
                    </span>
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
                      {patient.nationality || 'Bahraini'} • {formatDate(patient.dob)}
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
                <span>View Full File & Clinical Vitals</span>
                <ChevronRight className="w-4 h-4" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                    Patient Registration & CPR Intake
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Register new customer file and synchronize with clinic records
                  </p>
                </div>
              </div>

              {/* Prominent Large File Number Badge & Branch Selector */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Branch Selection Dropdown */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                    Registering Branch
                  </label>
                  <select
                    value={formHomeBranchId}
                    onChange={(e) => handleBranchChangeInForm(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        📍 {b.name.replace('Al Rabeesh ', '')} ({b.prefix})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Patient File ID
                  </span>
                  <div className="text-xl sm:text-2xl font-black tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-4 py-1.5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-xs flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>{formFileNumber}</span>
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
            <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Instant Smart Card Intake
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Insert CPR Card into reader and click scan to autofill all personal info & photo.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScanCardInModal(false, 0, 'standard')}
                  disabled={isReadingCard}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  title="Scan Standard CPR Card (chip on front)"
                >
                  <CreditCard className={`w-3.5 h-3.5 ${isReadingCard ? 'animate-spin' : ''}`} />
                  <span>{isReadingCard ? 'Reading...' : 'Scan Standard CPR'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScanCardInModal(false, 0, 'new_bahrain')}
                  disabled={isReadingCard}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  title="Scan New Issue Bahrain Smart Card (chip on back side)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scan New Card (Back Chip)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScanCardInModal(true, 0)}
                  className="px-2.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Full Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formNameEn}
                      onChange={(e) => setFormNameEn(e.target.value)}
                      placeholder="e.g. Mohammed Ali Al-Mahmood"
                      className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Full Name (Arabic)
                    </label>
                    <input
                      type="text"
                      value={formNameAr}
                      onChange={(e) => setFormNameAr(e.target.value)}
                      placeholder="e.g. محمد علي آل محمود"
                      dir="rtl"
                      className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-arabic"
                    />
                  </div>
                </div>
              </div>

              {/* CPR & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    CPR / National ID
                  </label>
                  <input
                    type="text"
                    value={formCpr}
                    onChange={(e) => setFormCpr(e.target.value)}
                    placeholder="e.g. 920512348"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
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
                    placeholder="e.g. Bahraini"
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
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
                >
                  Register & Create Patient File
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
