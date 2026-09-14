import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar, 
  Users, 
  Activity, 
  Stethoscope, 
  Sparkles, 
  Settings, 
  CreditCard, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Sun, 
  Moon, 
  UserCheck, 
  ShieldCheck, 
  User, 
  ChevronDown,
  PlusCircle
} from 'lucide-react';

export default function HorizontalNavbar({ onOpenNewPatient, onOpenNewAppointment }) {
  const { 
    activeTab, 
    setActiveTab, 
    theme, 
    toggleTheme, 
    activeUserRole, 
    setActiveUserRole, 
    settings, 
    cardReaderStatus, 
    isOnline, 
    isSyncing, 
    pendingSyncCount, 
    syncNow,
    triggerSmartCardRead,
    showToast
  } = useApp();

  const [isReadingCard, setIsReadingCard] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);

  const navItems = [
    { id: 'appointments', label: 'Doctor Schedule & Calendar', icon: Calendar, badge: 'Live Grid' },
    { id: 'patients', label: 'Patients & CPR Registry', icon: Users },
    { id: 'vitals', label: 'Vitals & Clinical X-Rays', icon: Activity },
    { id: 'doctors', label: 'Doctors & Dental Chairs', icon: Stethoscope },
    { id: 'services', label: 'Dental Services & Fees', icon: Sparkles },
    { id: 'settings', label: 'Settings & Localization', icon: Settings },
  ];

  const handleQuickCardRead = async (isSim = false, preset = 0) => {
    setIsReadingCard(true);
    try {
      await triggerSmartCardRead(isSim, preset);
      onOpenNewPatient(); // Open registration modal with scanned card filled
    } catch (err) {
      showToast('Smart Card reader not responding. You can use the Simulator fallback option.', 'warning');
      setShowSimMenu(true);
    } finally {
      setIsReadingCard(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-sm">
      {/* Top Branding & Quick Actions Bar */}
      <div className="w-full px-3 sm:px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Clinic Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  AL RABEEH
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                  Dental Center
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {settings.clinic_tagline || 'Bahrain & GCC Smart Card Integrated System'}
              </p>
            </div>
          </div>

          {/* Quick Action Center: Smart Card Reader + New Appointment */}
          <div className="flex items-center gap-3">
            
            {/* Smart Card Reader Quick Action with Dropdown for Simulator */}
            <div className="relative">
              <div className="inline-flex rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => handleQuickCardRead(false)}
                  disabled={isReadingCard}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-l-lg border transition-all ${
                    cardReaderStatus === 'CONNECTED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  }`}
                  title="Click to read National CPR Card from USB Reader"
                >
                  <CreditCard className={`w-4 h-4 ${isReadingCard ? 'animate-spin' : ''}`} />
                  <span>{isReadingCard ? 'Reading Card...' : 'Scan Smart Card'}</span>
                  {cardReaderStatus === 'CONNECTED' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSimMenu(!showSimMenu)}
                  className="px-2 py-2 text-xs font-semibold rounded-r-lg border-y border-r border-blue-600 bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center"
                  title="Smart Card Simulator Options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Simulator Dropdown */}
              {showSimMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs">
                  <div className="px-3 py-1 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    Smart Card Quick-Test Presets
                  </div>
                  <button
                    onClick={() => { setShowSimMenu(false); handleQuickCardRead(true, 0); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Abdulla Al-Doseri (Bahraini)</span>
                    <span className="text-[11px] text-slate-500">CPR: 910814992 • Muharraq</span>
                  </button>
                  <button
                    onClick={() => { setShowSimMenu(false); handleQuickCardRead(true, 1); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Maryam Al-Ghatam (Bahraini)</span>
                    <span className="text-[11px] text-slate-500">CPR: 870422119 • Seef</span>
                  </button>
                  <button
                    onClick={() => { setShowSimMenu(false); handleQuickCardRead(true, 2); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Vikram S. Pillai (Indian)</span>
                    <span className="text-[11px] text-slate-500">CPR: 940608553 • Adliya</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Book Appointment Button */}
            <button
              onClick={onOpenNewAppointment}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>

            {/* Offline / Online Sync Badge */}
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isOnline
                  ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
              title={isOnline ? 'Connected to Cloud Server. Click to force sync.' : 'Offline Mode (Local SQLite/IndexedDB Active)'}
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              )}
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
              {pendingSyncCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                  {pendingSyncCount}
                </span>
              )}
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            {/* Theme Switcher */}
            <button
              onClick={() => toggleTheme()}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
              >
                {activeUserRole === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                {activeUserRole === 'DOCTOR' && <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />}
                {activeUserRole === 'RECEPTIONIST' && <UserCheck className="w-3.5 h-3.5 text-amber-600" />}
                <span>{activeUserRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs font-medium">
                  {['ADMIN', 'DOCTOR', 'RECEPTIONIST'].map((role) => (
                    <button
                      key={role}
                      onClick={() => { setActiveUserRole(role); setShowRoleMenu(false); }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 ${
                        activeUserRole === role ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{role}</span>
                      {activeUserRole === role && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Primary Horizontal Navigation Menu Bar with Differentiated Background */}
      <div className="w-full bg-slate-100 dark:bg-slate-950 border-t border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 shadow-inner">
        <nav className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-500'
                    : 'text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-850 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
