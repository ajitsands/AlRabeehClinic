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
  Clock
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
    showToast 
  } = useApp();

  const [clinicName, setClinicName] = useState(settings.clinic_name);
  const [clinicTagline, setClinicTagline] = useState(settings.clinic_tagline);
  const [clinicPhone, setClinicPhone] = useState(settings.clinic_phone || '');
  const [clinicAddress, setClinicAddress] = useState(settings.clinic_address || '');

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
      <form onSubmit={handleSaveAll} className="space-y-5 w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-2">
      
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

      {/* 3. Smart Card Reader Bridge Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Smart Card Reader Daemon Configuration
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
              cardReaderStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700'
            }`}>
              Daemon: {cardReaderStatus}
            </span>
            <button
              type="button"
              onClick={handleTestReader}
              disabled={testingReader}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingReader ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

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
    </div>
  );
}
