import React, { useState, useEffect } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { smartCardService } from '../../services/smartCardReader';
import BranchesAndUsersView from '../branches/BranchesAndUsersView';
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
  Sliders,
  Users,
  Building2,
  Calendar,
  Image as ImageIcon,
  UploadCloud,
  RotateCcw,
  Trash2,
  Sparkles,
  ExternalLink,
  FileImage,
  CheckCircle2,
  Package,
  Terminal,
  Laptop
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
    users,
    resetToFreshDemoData,
    showToast 
  } = useApp();

  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Settings Sub-Menu Navigation
  const [subTab, setSubTab] = useState('branches_users'); // 'branches_users', 'profile', 'timings', 'localization', 'hardware', 'database'

  const [clinicName, setClinicName] = useState(settings.clinic_name);
  const [clinicTagline, setClinicTagline] = useState(settings.clinic_tagline);
  const [clinicLogoUrl, setClinicLogoUrl] = useState(settings.clinic_logo_url || '/logo.png');
  const [logoInputMode, setLogoInputMode] = useState('upload'); // 'upload' | 'url'
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [clinicPhone, setClinicPhone] = useState(settings.clinic_phone || '');
  const [clinicAddress, setClinicAddress] = useState(settings.clinic_address || '');

  // Keep logo in sync with settings
  useEffect(() => {
    if (settings.clinic_logo_url !== undefined) {
      setClinicLogoUrl(settings.clinic_logo_url || '/logo.png');
    }
  }, [settings.clinic_logo_url]);

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/)) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP)');
      showToast('Invalid file format. Please upload PNG, JPG, SVG or WebP', 'error');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setUploadError('Image file size is too large (max 2.5 MB). Please choose a smaller image.');
      showToast('Image size exceeds 2.5MB limit', 'warning');
      return;
    }

    setUploadError('');
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setClinicLogoUrl(base64Data);
      setIsUploadingLogo(false);
      showToast('Logo loaded for preview. Click "Save Profile Settings" to apply.', 'success');
    };
    reader.onerror = () => {
      setIsUploadingLogo(false);
      setUploadError('Failed to read image file');
      showToast('Error reading uploaded image', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = () => {
    if (!customLogoUrlInput.trim()) return;
    setClinicLogoUrl(customLogoUrlInput.trim());
    setUploadError('');
    showToast('Image URL applied to preview. Click "Save Profile Settings" to confirm.', 'info');
  };

  const handleResetToDefaultLogo = () => {
    setClinicLogoUrl('/logo.png');
    setCustomLogoUrlInput('');
    setUploadError('');
    showToast('Reset to default Al Rabeesh logo', 'info');
  };

  const handleRemoveLogo = () => {
    setClinicLogoUrl('');
    setCustomLogoUrlInput('');
    setUploadError('');
    showToast('Logo removed', 'info');
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
  const [readerTestResult, setReaderTestResult] = useState(null);
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
    if (e) e.preventDefault();
    await updateSettings({
      clinic_name: clinicName,
      clinic_tagline: clinicTagline,
      clinic_logo_url: clinicLogoUrl,
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
    setReaderTestResult(null);
    try {
      const result = await smartCardService.testConnection({
        wsUrl: readerWsUrl,
        restUrl: readerRestUrl
      });
      setReaderTestResult(result);
      if (result.overall) {
        showToast(result.message, 'success', 6000);
      } else {
        showToast('Local service connection failed. Please ensure CIO GCC CardRead Server is running.', 'error', 6000);
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
      branches: await db.branches.toArray(),
      users: await db.users.toArray(),
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

  const subMenuTabs = [
    { id: 'branches_users', label: 'Branches & Users', icon: Building2, badge: `${branches.length} Br / ${users?.length || 0} Usr` },
    { id: 'profile', label: 'Clinic Profile & Theme', icon: Building },
    { id: 'timings', label: 'Operating Hours & Breaks', icon: Clock },
    { id: 'localization', label: 'Gulf & India Localization', icon: Globe },
    { id: 'hardware', label: 'Smart Card Hardware & Drivers', icon: CreditCard, badge: cardReaderStatus },
    { id: 'database', label: 'Database & Sync', icon: Database, badge: `${pendingSyncCount} pending` },
  ];

  return (
    <div className="w-full flex justify-center">
      <div className="space-y-4 w-full max-w-[1720px] px-2 sm:px-4 lg:px-6 py-2">
        
        {/* Settings Master Navigation Bar / Sub-Menu */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {subMenuTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {subTab !== 'branches_users' && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition shrink-0 cursor-pointer self-end md:self-auto"
            >
              Save Settings
            </button>
          )}
        </div>

        {/* 1. SUB-TAB: BRANCHES & USERS */}
        {subTab === 'branches_users' && (
          <BranchesAndUsersView />
        )}

        {/* 2. SUB-TAB: CLINIC PROFILE & THEME */}
        {subTab === 'profile' && (
          <form onSubmit={handleSaveAll} className="space-y-4">
            
            {/* Master Clinic Logo & Branding Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Clinic Brand Logo & Emblem</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Live Sync
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload your clinic logo to appear on the top navigation bar, patient records, and printed prescriptions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Restore default Al Rabeesh logo"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default Logo</span>
                  </button>
                  {clinicLogoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Logo Grid: Previews on Left, Uploader on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Left: Dual Theme Live Previews */}
                <div className="lg:col-span-6 space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Live Appearance Preview
                  </span>

                  {/* 1. Light Mode Preview */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-250 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" /> Light Navbar Header
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Day Mode</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-slate-50/80 rounded-lg border border-slate-150">
                      {clinicLogoUrl ? (
                        <div className="h-10 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                          <img 
                            src={clinicLogoUrl} 
                            alt="Clinic Logo Preview" 
                            className="h-8 max-h-8 w-auto max-w-[130px] object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm tracking-tight text-slate-900">
                            {clinicName ? clinicName.toUpperCase() : 'AL RABEEH'}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full">
                            Dental Center
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                          {clinicTagline || 'Bahrain & GCC Smart Card Integrated System'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Dark Mode Preview */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-400" /> Dark Navbar Header
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Operatory Night Mode</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
                      {clinicLogoUrl ? (
                        <div className="h-10 px-2.5 py-1 bg-slate-850 rounded-lg border border-slate-700 shadow-2xs flex items-center justify-center">
                          <img 
                            src={clinicLogoUrl} 
                            alt="Clinic Logo Preview" 
                            className="h-8 max-h-8 w-auto max-w-[130px] object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm tracking-tight text-white">
                            {clinicName ? clinicName.toUpperCase() : 'AL RABEEH'}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-blue-900/60 text-blue-300 rounded-full border border-blue-800">
                            Dental Center
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                          {clinicTagline || 'Bahrain & GCC Smart Card Integrated System'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Upload & URL Configuration */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Change Logo Image
                    </span>

                    {/* Mode Toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setLogoInputMode('upload')}
                        className={`px-2.5 py-1 rounded-md transition ${
                          logoInputMode === 'upload' 
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoInputMode('url')}
                        className={`px-2.5 py-1 rounded-md transition ${
                          logoInputMode === 'url' 
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Image URL
                      </button>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {logoInputMode === 'upload' ? (
                    <div>
                      <label 
                        htmlFor="clinic-logo-file-input"
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-250 dark:border-blue-800/80 hover:border-blue-500 dark:hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 rounded-2xl cursor-pointer transition text-center group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {isUploadingLogo ? 'Processing image...' : 'Click to browse or drop clinic logo here'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Supported formats: PNG, SVG, JPG, WebP (Max 2.5MB)
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-2 px-2 py-0.5 rounded-full bg-blue-100/60 dark:bg-blue-900/40">
                          Recommended size: 240×60px transparent PNG
                        </span>
                      </label>
                      <input
                        id="clinic-logo-file-input"
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 text-xs">
                      <label className="block font-bold uppercase text-slate-600 dark:text-slate-300">
                        External Logo URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com/logo.png or /logo.png"
                          value={customLogoUrlInput}
                          onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyLogoUrl}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          Apply URL
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Enter a direct link to any hosted clinic logo image (e.g. from your web server or CDN).
                      </p>
                    </div>
                  )}

                  {/* Logo Source / Status indicator */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileImage className="w-3.5 h-3.5 text-blue-500" />
                      <span>Current Logo Source:</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
                      {clinicLogoUrl ? (clinicLogoUrl.startsWith('data:') ? 'Custom Upload (Base64)' : clinicLogoUrl) : 'No Logo Set'}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Clinic Identity Profile */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 text-xs">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Dental Clinic Identity
                  </h3>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={clinicTagline}
                    onChange={(e) => setClinicTagline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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
                    <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Main Address
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

              {/* Theme & Display Mode */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Application Theme
                    </h3>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Switch between Clean Light Mode and Dark Mode for high-contrast operatory lighting.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTheme('light')}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold border transition ${
                        theme === 'light' 
                          ? 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-500" />
                      <span>Light Theme</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTheme('dark')}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold border transition ${
                        theme === 'dark' 
                          ? 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <span>Dark Theme</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile & Branding Settings</span>
                </button>
              </div>

            </div>
          </form>
        )}

        {/* 3. SUB-TAB: OPERATING HOURS & BREAKS */}
        {subTab === 'timings' && (
          <form onSubmit={handleSaveAll} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Clinic Operating Timings & Break Protection
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Define working hours and automatically block appointments during lunch/prayer breaks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enable Break Window:
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
                  Opening Time
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
                  Closing Time
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
                  Base Slot Duration
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

            {/* Break Schedule */}
            {breakEnabled && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold">
                  <Clock className="w-4 h-4" />
                  <span>Configured Break Window (Calendar Slots Are Automatically Blocked)</span>
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
                      Break Description
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

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Save Timings Settings
              </button>
            </div>
          </form>
        )}

        {/* 4. SUB-TAB: GULF & INDIA LOCALIZATION */}
        {subTab === 'localization' && (
          <form onSubmit={handleSaveAll} className="space-y-4">
            
            {/* Presets */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Regional & Localization Presets (Gulf & India)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any country preset to instantly configure Timezone, Currency with 3 decimals (BHD/KWD/OMR), and Date formats:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
                {REGIONAL_PRESETS.map((p) => {
                  const isSelected = currencyCode === p.code;
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleApplyRegionalPreset(p)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
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

            {/* Custom Currency & Date Details */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Custom Currency, Decimal Precision & Timezone
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
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

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Save Localization Settings
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 5. SUB-TAB: SMART CARD HARDWARE & DRIVERS */}
        {subTab === 'hardware' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Smart Card Reader Drivers & Local Windows Service</span>
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
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingReader ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>
            </div>

            {/* Live Diagnostic Results Banner if tested */}
            {readerTestResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                readerTestResult.overall
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {readerTestResult.overall ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="font-extrabold text-sm">
                      {readerTestResult.overall 
                        ? 'Smart Card Local Service is Operational & Ready' 
                        : 'Local Service Connection Warning'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-70">
                    Checked {new Date().toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed">
                  {readerTestResult.message}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-900/60">
                    <span className="font-bold">REST API (Port 5050):</span>
                    <span className={`font-extrabold ${readerTestResult.rest.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {readerTestResult.rest.ok ? '✓ Online & Ready' : '✗ Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-900/60">
                    <span className="font-bold">WebSocket (Port 5060):</span>
                    <span className={`font-extrabold ${readerTestResult.ws.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {readerTestResult.ws.ok ? '✓ Connected' : '○ Standby'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Standalone 2026 Bridge ZIP Package (Recommended for Any PC) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200 dark:border-blue-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Bahrain Smart Card Bridge 2026 Standalone Package (.ZIP)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    ★ Recommended
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed max-w-2xl">
                  Contains the complete, pre-configured 32-bit Smart Card Server supporting <strong>both Old CPR Cards (Front Chip)</strong> and <strong>New 2025/2026 Smart Cards (Back Chip - Version 6)</strong> with 1-click launcher.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Package: Bahrain_Smart_Card_Bridge_v2026.zip (59.2 MB)</span>
                  <span>•</span>
                  <span>Port: 5050 (REST & HTML Diagnostics)</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy('E:\\Al Rabeesh Software\\downloads\\Bahrain_Smart_Card_Bridge_v2026.zip', 'zipPath', 'Package File Path')}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                >
                  {copiedKey === 'zipPath' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'zipPath' ? 'Path Copied' : 'Copy Local Path'}</span>
                </button>

                <a
                  href="/downloads/Bahrain_Smart_Card_Bridge_v2026.zip"
                  download="Bahrain_Smart_Card_Bridge_v2026.zip"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ZIP Package</span>
                </a>

                <a
                  href="http://localhost:5050/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  <span>Open Diagnostic (Port 5050)</span>
                </a>
              </div>
            </div>

            {/* 4-Step Installation Procedure for Any Other Computer */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-blue-600" />
                <span>How to Install & Enable on Another Computer (Reception / Doctor PC)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Step 1: Extract Zip */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Step 1: Extract Package
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        Files
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Download and extract <strong className="text-slate-800 dark:text-slate-100">Bahrain_Smart_Card_Bridge_v2026.zip</strong> to <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">C:\Al Rabeesh Software\</code>.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-slate-500 font-mono">
                    Includes: Bridge.exe + DLLs
                  </div>
                </div>

                {/* Step 2: Plug USB Reader */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Step 2: Plug USB Reader
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Hardware
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Plug your USB Smart Card Reader into the PC. Windows 10/11 will automatically configure the built-in CCID smartcard driver.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-slate-500">
                    Auto-detected by Windows
                  </div>
                </div>

                {/* Step 3: Run Launcher */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Step 3: Run Launcher
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Port 5050
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Right-click <strong className="text-slate-800 dark:text-slate-100">Start_Bahrain_Card_Bridge.bat</strong> ➔ <strong>Run as administrator</strong>. It configures Port 5050 permissions and starts the bridge.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Self-Configuring
                  </div>
                </div>

                {/* Step 4: Auto-Start on Boot */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        Step 4: Auto-Start on Boot
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        Startup
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Press <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[10px]">Win+R</kbd>, type <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">shell:startup</code>, and create a shortcut to <strong className="text-slate-800 dark:text-slate-100">Start_Bahrain_Card_Bridge.bat</strong>.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                    ✓ Runs every morning
                  </div>
                </div>
              </div>
            </div>

            {/* CPR Card Insertion & Orientation Guide */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  🪪
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Supported Bahrain National CPR Card Types:
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    • <strong>Standard Old CPR Cards:</strong> Gold chip on front ➔ Insert chip facing UP.
                    <br />
                    • <strong>New 2025/2026 Version 6 Cards:</strong> Gold chip on back ➔ Insert chip touching reader pins.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Dual-Card Engine
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  Full Photo & Address
                </span>
              </div>
            </div>

            {/* Secondary Reference / Legacy Official Installers */}
            <div className="pt-1">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-slate-500" />
                <span>Legacy Official CIO Drivers (Optional References)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Official eRevealer Setup (50.6 MB)
                    </span>
                    <span className="text-[10px] text-slate-500">eRevealerSetup 5.4.0.4.exe</span>
                  </div>
                  <a
                    href="/downloads/eRevealerSetup 5.4.0.4.exe"
                    download="eRevealerSetup 5.4.0.4.exe"
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Official SCardReadServer Setup (6.1 MB)
                    </span>
                    <span className="text-[10px] text-slate-500">SCardReadServer.exe</span>
                  </div>
                  <a
                    href="/downloads/SCardReadServer.exe"
                    download="SCardReadServer.exe"
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div className="pt-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-500" />
                <span>Connection Endpoints & Ports</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Local WebSocket Endpoint (Port 5060)
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
                    RESTful Fallback URL (Port 5050)
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

            {/* Help box */}
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
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1.5 mt-2">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Important for Cloud / HTTPS Browser Access ({typeof window !== 'undefined' ? window.location.origin : 'https://alrabeesh.sandslab.com'}):</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Chrome and Edge security policies block HTTPS pages from connecting to local PC USB hardware (Port 5050). 
                    <br />
                    <strong>To allow hardware access:</strong> Click the <strong>🔒 Lock / Tune icon</strong> in the browser address bar ➔ Click <strong>Site settings</strong> ➔ Change <strong>Insecure content</strong> to <strong>Allow</strong> ➔ Refresh the page.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 6. SUB-TAB: DATABASE & CLOUD SYNC */}
        {subTab === 'database' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Local Offline Storage (IndexedDB / SQLite Sync)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={syncNow}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Trigger Sync ({pendingSyncCount} pending)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON Backup</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Patients</span>
                <span className="text-lg font-extrabold text-blue-600">{stats.patients}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Appointments</span>
                <span className="text-lg font-extrabold text-indigo-600">{stats.appointments}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Vitals Logs</span>
                <span className="text-lg font-extrabold text-emerald-600">{stats.vitals}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Attachments</span>
                <span className="text-lg font-extrabold text-purple-600">{stats.attachments}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Doctors</span>
                <span className="text-lg font-extrabold text-amber-600">{stats.doctors}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Services</span>
                <span className="text-lg font-extrabold text-rose-600">{stats.services}</span>
              </div>
            </div>

            {/* Fresh Multi-Branch Demo Data Reset Action Card */}
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-extrabold text-xs text-rose-900 dark:text-rose-200 block flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reset Database & Seed Clean Multi-Branch Demo Data</span>
                </span>
                <span className="text-[11px] text-rose-700 dark:text-rose-400 block mt-0.5">
                  Wipes old test data and cleanly loads 4 Branches, 8 Doctors, 13 Staff Users, 8 Patients with Branch Prefixes, and Today's Bookings.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset to Fresh Demo Data</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Reset Database to Fresh Demo Data?
                </h3>
                <p className="text-xs text-slate-500">
                  This will reload clean multi-branch records across all 4 branches.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>You will get clean, organized demo data containing:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                <li><strong className="text-slate-900 dark:text-white">4 Branches:</strong> Manama, Riffa, Seef, Muharraq</li>
                <li><strong className="text-slate-900 dark:text-white">8 Doctors:</strong> 2 dedicated specialists per branch</li>
                <li><strong className="text-slate-900 dark:text-white">13 Staff Accounts:</strong> Super Admin, Branch Admins, Receptionists</li>
                <li><strong className="text-slate-900 dark:text-white">8 Sample Patients:</strong> With unique branch file numbers (ARB-MNM, ARB-RFA, etc.)</li>
                <li><strong className="text-slate-900 dark:text-white">Today's Schedule:</strong> Realistic bookings on each branch's chairs</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsResetting(true);
                  setShowResetConfirm(false);
                  await resetToFreshDemoData();
                  await loadStats();
                  setIsResetting(false);
                }}
                className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Yes, Reset Database Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
