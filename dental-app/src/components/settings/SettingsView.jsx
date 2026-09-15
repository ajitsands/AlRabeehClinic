import React, { useState, useEffect } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { smartCardService } from '../../services/smartCardReader';
import { 
  Settings, 
  Globe, 
  Moon, 
  Sun, 
  CreditCard, 
  ShieldCheck, 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Building,
  DollarSign,
  Clock,
  Cpu,
  Copy,
  Check,
  HelpCircle,
  Sliders
} from 'lucide-react';

const REGIONAL_PRESETS = [
  {
    country: 'Bahrain (Default)',
    code: 'BHD',
    symbol: 'BD',
    decimals: 3,
    timezone: 'Asia/Bahrain',
    dateFormat: 'DD/MM/YYYY'
  },
  {
    country: 'Saudi Arabia',
    code: 'SAR',
    symbol: 'SAR',
    decimals: 2,
    timezone: 'Asia/Riyadh',
    dateFormat: 'DD/MM/YYYY'
  },
  {
    country: 'United Arab Emirates',
    code: 'AED',
    symbol: 'AED',
    decimals: 2,
    timezone: 'Asia/Dubai',
    dateFormat: 'DD/MM/YYYY'
  },
  {
    country: 'Kuwait',
    code: 'KWD',
    symbol: 'KD',
    decimals: 3,
    timezone: 'Asia/Kuwait',
    dateFormat: 'DD/MM/YYYY'
  },
  {
    country: 'Oman',
    code: 'OMR',
    symbol: 'OMR',
    decimals: 3,
    timezone: 'Asia/Muscat',
    dateFormat: 'DD/MM/YYYY'
  },
  {
    country: 'Qatar',
    code: 'QAR',
    symbol: 'QR',
    decimals: 2,
    timezone: 'Asia/Qatar',
    dateFormat: 'DD/MM/YYYY'
  },
  {
    country: 'India',
    code: 'INR',
    symbol: '₹',
    decimals: 2,
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY'
  }
];

export default function SettingsView() {
  const { 
    settings, 
    updateSettings, 
    theme, 
    toggleTheme, 
    cardReaderStatus, 
    syncNow, 
    isSyncing, 
    pendingSyncCount,
    branches,
    activeBranchId,
    setActiveBranchId,
    saveBranch,
    showToast 
  } = useApp();

  const [clinicName, setClinicName] = useState(settings.clinic_name);
  const [clinicTagline, setClinicTagline] = useState(settings.clinic_tagline);
  const [clinicPhone, setClinicPhone] = useState(settings.clinic_phone || '');
  const [clinicAddress, setClinicAddress] = useState(settings.clinic_address || '');

  // Multi-Branch Management State
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormCode, setBranchFormCode] = useState('');
  const [branchFormPrefix, setBranchFormPrefix] = useState('');
  const [branchFormAddress, setBranchFormAddress] = useState('');
  const [branchFormPhone, setBranchFormPhone] = useState('');
  const [branchFormColor, setBranchFormColor] = useState('#2563EB');

  const handleOpenBranchModal = (br = null) => {
    if (br) {
      setEditingBranch(br);
      setBranchFormName(br.name);
      setBranchFormCode(br.code);
      setBranchFormPrefix(br.prefix);
      setBranchFormAddress(br.address || '');
      setBranchFormPhone(br.phone || '');
      setBranchFormColor(br.color || '#2563EB');
    } else {
      setEditingBranch(null);
      setBranchFormName('');
      setBranchFormCode('');
      setBranchFormPrefix('');
      setBranchFormAddress('');
      setBranchFormPhone('');
      setBranchFormColor('#10B981');
    }
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchFormName || !branchFormCode || !branchFormPrefix) {
      showToast('Please fill in Branch Name, Code, and Patient Prefix', 'error');
      return;
    }

    const branchData = {
      id: editingBranch ? editingBranch.id : `branch-${branchFormCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      name: branchFormName,
      code: branchFormCode.toUpperCase(),
      prefix: branchFormPrefix.toUpperCase(),
      address: branchFormAddress,
      phone: branchFormPhone,
      color: branchFormColor,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    await saveBranch(branchData);
    setBranchModalOpen(false);
  };

  // Operating Hours & Break Schedule State
  const [clinicOpenTime, setClinicOpenTime] = useState(settings.clinic_open_time || '09:00');
  const [clinicCloseTime, setClinicCloseTime] = useState(settings.clinic_close_time || '17:30');
  const [slotIntervalMins, setSlotIntervalMins] = useState(settings.slot_interval_mins ?? 30);
  const [breakEnabled, setBreakEnabled] = useState(settings.break_enabled ?? true);
  const [breakStartTime, setBreakStartTime] = useState(settings.break_start_time || '13:00');
  const [breakEndTime, setBreakEndTime] = useState(settings.break_end_time || '14:00');
  const [breakLabel, setBreakLabel] = useState(settings.break_label || 'Lunch & Sanitization Break');

  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Bahrain');
  const [dateFormat, setDateFormat] = useState(settings.date_format || 'DD/MM/YYYY');
  const [currencyCode, setCurrencyCode] = useState(settings.currency_code || 'BHD');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || 'BD');
  const [currencyDecimals, setCurrencyDecimals] = useState(settings.currency_decimals ?? 3);

  const [readerWsUrl, setReaderWsUrl] = useState(settings.reader_ws_url || 'ws://localhost:5060/SCardRead');
  const [readerRestUrl, setReaderRestUrl] = useState(settings.reader_rest_url || 'http://localhost:5050/api/operation/ReadCard');
  
  const [testingReader, setTestingReader] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key, label) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${label} to clipboard`, 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    vitals: 0,
    attachments: 0,
    doctors: 0,
    services: 0
  });

  const loadStats = async () => {
    const p = await db.patients.count();
    const a = await db.appointments.count();
    const v = await db.vitals.count();
    const att = await db.attachments.count();
    const d = await db.doctors.count();
    const s = await db.services.count();
    setStats({ patients: p, appointments: a, vitals: v, attachments: att, doctors: d, services: s });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleApplyRegionalPreset = (preset) => {
    setCurrencyCode(preset.code);
    setCurrencySymbol(preset.symbol);
    setCurrencyDecimals(preset.decimals);
    setTimezone(preset.timezone);
    setDateFormat(preset.dateFormat);
    showToast(`Applied preset for ${preset.country}`, 'info');
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    await updateSettings({
      clinic_name: clinicName,
      clinic_tagline: clinicTagline,
      clinic_phone: clinicPhone,
      clinic_address: clinicAddress,
      clinic_open_time: clinicOpenTime,
      clinic_close_time: clinicCloseTime,
      slot_interval_mins: Number(slotIntervalMins),
      break_enabled: Boolean(breakEnabled),
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
      break_label: breakLabel,
      timezone: timezone,
      date_format: dateFormat,
      currency_code: currencyCode,
      currency_symbol: currencySymbol,
      currency_decimals: Number(currencyDecimals),
      reader_ws_url: readerWsUrl,
      reader_rest_url: readerRestUrl
    });
  };

  const handleTestReader = async () => {
    setTestingReader(true);
    try {
      const ok = await smartCardService.connect(readerWsUrl);
      if (ok) {
        showToast('Successfully connected to local Smart Card Reader service (Port 5060)', 'success');
      } else {
        showToast('Local service connection failed. Please ensure SCardReadServer is running.', 'error');
      }
    } catch (err) {
      showToast(`Reader test failed: ${err.message}`, 'error');
    } finally {
      setTestingReader(false);
    }
  };

  const handleExportBackup = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings: await db.settings.toArray(),
      patients: await db.patients.toArray(),
      appointments: await db.appointments.toArray(),
      vitals: await db.vitals.toArray(),
      attachments: await db.attachments.toArray(),
      doctors: await db.doctors.toArray(),
      services: await db.services.toArray()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlRabeesh_Dental_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Clinic database exported successfully', 'success');
  };

  return (
    <div className="w-full flex justify-center">
      <form onSubmit={handleSaveAll} className="space-y-5 w-full max-w-7xl px-3 sm:px-5 lg:px-6 py-2">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              System Settings & Localization
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure Theme, Operating Hours, Break Times, Gulf & India Localization, and Smart Card Reader
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
        >
          Save All Settings
        </button>
      </div>

      {/* 0. MULTI-BRANCH LOCATIONS & TERMINAL SETTINGS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Multi-Branch Clinic Locations & Offline Numbering
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage branch locations, unique offline numbering prefixes (e.g. ARB-MNM, ARB-RFA), and active terminal branch
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBranchModal()}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm self-end sm:self-auto cursor-pointer"
          >
            <span>+ Add Clinic Branch</span>
          </button>
        </div>

        {/* Current Active Terminal Branch Selection */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Current Terminal Active Branch:
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              New appointments, calendar bookings, and patient registrations will default to this branch.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} ({b.prefix})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Branch Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {branches.map(b => {
            const isTerminalActive = activeBranchId === b.id;
            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isTerminalActive
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30'
                }`}
                style={{ borderTop: `4px solid ${b.color || '#3B82F6'}` }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                      {b.prefix}
                    </span>
                    {isTerminalActive && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        This Terminal
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {b.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {b.address || 'No address specified'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    📞 {b.phone || 'N/A'}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveBranchId(b.id)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Set Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBranchModal(b)}
                    className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. CLINIC OPERATING HOURS & BREAK SCHEDULE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Clinic Operating Timings & Break Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define working hours (e.g. 09:00 to 17:30) and block appointments during Lunch/Prayer break
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Enable Break Time:
            </span>
            <button
              type="button"
              onClick={() => setBreakEnabled(!breakEnabled)}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                breakEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                  breakEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Operating Hours Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
              Clinic Opening Time
            </label>
            <input
              type="time"
              value={clinicOpenTime}
              onChange={(e) => setClinicOpenTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
              Clinic Closing Time
            </label>
            <input
              type="time"
              value={clinicCloseTime}
              onChange={(e) => setClinicCloseTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
              Base Slot Interval
            </label>
            <select
              value={slotIntervalMins}
              onChange={(e) => setSlotIntervalMins(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
            >
              <option value={15}>15 Minutes per Slot</option>
              <option value={30}>30 Minutes per Slot (Standard)</option>
              <option value={45}>45 Minutes per Slot</option>
              <option value={60}>60 Minutes per Slot</option>
            </select>
          </div>
        </div>

        {/* Break Schedule Configuration */}
        {breakEnabled && (
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold">
              <Clock className="w-4 h-4" />
              <span>Configured Break Window (Appointments & Consultations are blocked)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold uppercase text-amber-900 dark:text-amber-300 mb-1">
                  Break Start Time
                </label>
                <input
                  type="time"
                  value={breakStartTime}
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-amber-900 dark:text-amber-300 mb-1">
                  Break End Time
                </label>
                <input
                  type="time"
                  value={breakEndTime}
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-amber-900 dark:text-amber-300 mb-1">
                  Break Label / Description
                </label>
                <input
                  type="text"
                  value={breakLabel}
                  onChange={(e) => setBreakLabel(e.target.value)}
                  placeholder="e.g. Lunch & Sanitization Break"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                <span>Calendar protection active:</span>
              </span>
              <span>
                {breakStartTime} to {breakEndTime} ({breakLabel})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Regional Presets Quick-Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Regional & Localization Presets (Gulf & India)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Click any country preset to quickly configure Timezone, Currency with 3 decimals (BHD/KWD/OMR), and Date formats:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {REGIONAL_PRESETS.map((p) => {
            const isSelected = currencyCode === p.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => handleApplyRegionalPreset(p)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-extrabold text-xs">{p.country}</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                  {p.symbol} ({p.decimals} dec)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Theme & Appearance & Clinic Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Clinic Identity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Dental Clinic Profile
            </h3>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
              Clinic Name
            </label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={clinicTagline}
              onChange={(e) => setClinicTagline(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Currency & Date Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Currency & Time Customization
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Display Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Decimals
              </label>
              <select
                value={currencyDecimals}
                onChange={(e) => setCurrencyDecimals(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
              >
                <option value={3}>3 Decimals (BHD, KWD, OMR)</option>
                <option value={2}>2 Decimals (SAR, AED, INR)</option>
                <option value={0}>0 Decimals</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Time Zone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium text-slate-900 dark:text-white"
              >
                <option value="Asia/Bahrain">Bahrain (Asia/Bahrain GMT+3)</option>
                <option value="Asia/Riyadh">Saudi Arabia (Asia/Riyadh GMT+3)</option>
                <option value="Asia/Dubai">UAE (Asia/Dubai GMT+4)</option>
                <option value="Asia/Kuwait">Kuwait (Asia/Kuwait GMT+3)</option>
                <option value="Asia/Muscat">Oman (Asia/Muscat GMT+4)</option>
                <option value="Asia/Qatar">Qatar (Asia/Qatar GMT+3)</option>
                <option value="Asia/Kolkata">India IST (Asia/Kolkata GMT+5:30)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium text-slate-900 dark:text-white"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/09/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-15)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/15/2026)</option>
              </select>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="pt-1">
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
              Active Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                className={`py-2 rounded-xl flex items-center justify-center gap-2 font-bold border transition ${
                  theme === 'light' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme (Default)</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                className={`py-2 rounded-xl flex items-center justify-center gap-2 font-bold border transition ${
                  theme === 'dark' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Theme</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Smart Card Reader Driver & Installation Procedures */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
        
        {/* Section Header & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Smart Card Reader Drivers & Installation Procedures</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                  Bahrain & GCC
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup guide, driver installer paths, Windows Service daemon, and live hardware diagnostics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 border ${
              cardReaderStatus === 'CONNECTED' 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${cardReaderStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>Daemon: {cardReaderStatus}</span>
            </span>

            <button
              type="button"
              onClick={handleTestReader}
              disabled={testingReader}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingReader ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        {/* 4-Step Installation & Setup Procedure */}
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Driver Installation & Hardware Setup Steps</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Step 1: Install Drivers */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Step 1: Driver & Middleware Installer
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    50.6 MB
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed mb-2">
                  Install <strong className="text-slate-800 dark:text-slate-100">eRevealerSetup 5.4.0.4.exe</strong> to deploy PC/SC smart card drivers and Bahrain CIO ID Card native libraries.
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  eRevealerSetup 5.4.0.4.exe
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy('E:\\Al Rabeesh Software\\ReaderSDK\\eRevealerSetup\\eRevealerSetup 5.4.0.4.exe', 'installer', 'Installer Path')}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] border border-slate-200 dark:border-slate-600 flex items-center gap-1 shrink-0"
                    title="Copy local disk path"
                  >
                    {copiedKey === 'installer' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'installer' ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href="/downloads/eRevealerSetup 5.4.0.4.exe"
                    download="eRevealerSetup 5.4.0.4.exe"
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition"
                    title="Directly download eRevealerSetup 5.4.0.4.exe"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Now</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2: Windows Service / Daemon */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Step 2: Windows Service Daemon
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    6.1 MB (Port 5060)
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed mb-2">
                  Verify <strong className="text-slate-800 dark:text-slate-100">CIO GCC CardRead Server</strong> is running as a Windows Service or run <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">SCardReadServer.exe</code>.
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  SCardReadServer.exe
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy('E:\\Al Rabeesh Software\\ReaderSDK\\SCardReadServer\\SCardReadServer\\SCardReadServer.exe', 'daemon', 'Daemon Path')}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] border border-slate-200 dark:border-slate-600 flex items-center gap-1 shrink-0"
                    title="Copy local disk path"
                  >
                    {copiedKey === 'daemon' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'daemon' ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href="/downloads/SCardReadServer.exe"
                    download="SCardReadServer.exe"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition"
                    title="Directly download SCardReadServer.exe"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Now</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Step 3: Hardware Connection */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Step 3: Connect USB Smart Card Reader
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Hardware
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Plug standard USB Smart Card Reader (Omnikey 3121, Identiv uTrust 2700R, or ACS ACR39U) into PC. The reader LED indicator will show solid green when ready.
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Supported:</span>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Omnikey • Identiv • ACS • Feitian</span>
              </div>
            </div>

            {/* Step 4: Live Card Intake & Simulator */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Step 4: Smart Card Reading & Testing
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    Auto-Fill
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Click <strong className="text-slate-800 dark:text-slate-100">"Scan Smart Card"</strong> in the top navbar to read CPR, names, and photo in 1 click. If card is absent, use the built-in test simulator presets.
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">Live Intake:</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ CPR • Names • DOB • Photo</span>
              </div>
            </div>

          </div>
        </div>

        {/* Configuration Endpoints */}
        <div className="pt-1">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Connection Endpoints & Ports</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Local WebSocket Endpoint (SCardReadWebApi.exe)
              </label>
              <input
                type="text"
                value={readerWsUrl}
                onChange={(e) => setReaderWsUrl(e.target.value)}
                placeholder="ws://localhost:5060/SCardRead"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                RESTful Fallback URL
              </label>
              <input
                type="text"
                value={readerRestUrl}
                onChange={(e) => setReaderRestUrl(e.target.value)}
                placeholder="http://localhost:5050/api/operation/ReadCard"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Troubleshooting Guidance Box */}
        <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              Quick Troubleshooting for Reception & IT Staff:
            </span>
            <p>
              • If reader shows <span className="font-bold text-amber-600">DISCONNECTED</span>, ensure the USB cable is firmly plugged into the PC and the Windows Service <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono">CIO GCC CardRead Server</code> is Started.
            </p>
            <p>
              • To manually restart the service, run command: <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono">net start "CIO GCC CardRead Server"</code> in Administrator Command Prompt.
            </p>
          </div>
        </div>

      </div>

      {/* 4. Database Stats & Backup */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Local Offline Database (IndexedDB / SQLite Sync)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={syncNow}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Trigger Sync ({pendingSyncCount} pending)</span>
            </button>
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 text-center">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Patients</span>
            <span className="text-base font-extrabold text-blue-600">{stats.patients}</span>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Appointments</span>
            <span className="text-base font-extrabold text-indigo-600">{stats.appointments}</span>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Vitals Logs</span>
            <span className="text-base font-extrabold text-emerald-600">{stats.vitals}</span>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Attachments</span>
            <span className="text-base font-extrabold text-purple-600">{stats.attachments}</span>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Doctors</span>
            <span className="text-base font-extrabold text-amber-600">{stats.doctors}</span>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Services</span>
            <span className="text-base font-extrabold text-rose-600">{stats.services}</span>
          </div>
        </div>

      </div>
    </form>

    {/* BRANCH CREATE / EDIT MODAL */}
    {branchModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingBranch ? 'Edit Clinic Branch' : 'Add New Clinic Branch'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setBranchModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                required
                value={branchFormName}
                onChange={(e) => setBranchFormName(e.target.value)}
                placeholder="e.g. Al Rabeesh Manama Branch"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  required
                  value={branchFormCode}
                  onChange={(e) => setBranchFormCode(e.target.value)}
                  placeholder="e.g. MNM, RFA, SEF"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Patient File Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={branchFormPrefix}
                  onChange={(e) => setBranchFormPrefix(e.target.value)}
                  placeholder="e.g. ARB-MNM, ARB-RFA"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase font-bold text-blue-600 dark:text-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={branchFormPhone}
                  onChange={(e) => setBranchFormPhone(e.target.value)}
                  placeholder="e.g. +973 1722 3344"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Branch Color Tag
                </label>
                <input
                  type="color"
                  value={branchFormColor}
                  onChange={(e) => setBranchFormColor(e.target.value)}
                  className="w-full h-10 rounded-xl cursor-pointer p-1 bg-slate-50 dark:bg-slate-800 border"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Branch Address
              </label>
              <input
                type="text"
                value={branchFormAddress}
                onChange={(e) => setBranchFormAddress(e.target.value)}
                placeholder="e.g. Building 124, Road 3801, Manama Center"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setBranchModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Save Branch
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
}
