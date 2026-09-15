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
  PlusCircle,
  MapPin,
  Building2,
  Check,
  Lock,
  Crown,
  Building,
  KeyRound,
  X,
  Shield
} from 'lucide-react';

import SyncCenterModal from '../common/SyncCenterModal';

export default function HorizontalNavbar({ onOpenNewPatient, onOpenNewAppointment }) {
  const { 
    activeTab, 
    setActiveTab, 
    theme, 
    toggleTheme, 
    currentUser,
    users,
    loginAsUser,
    isSuperAdmin,
    branches,
    activeBranchId,
    activeBranch,
    setActiveBranchId,
    settings, 
    cardReaderStatus, 
    isOnline, 
    isSyncing, 
    pendingSyncCount, 
    triggerSmartCardRead,
    showToast
  } = useApp();

  const [isReadingCard, setIsReadingCard] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isUserLoginModalOpen, setIsUserLoginModalOpen] = useState(false);
  const [userModalFilter, setUserModalFilter] = useState('ALL');

  const navItems = [
    { id: 'appointments', label: 'Doctor Schedule & Calendar', icon: Calendar, badge: 'Live Grid' },
    { id: 'patients', label: 'Patients & CPR Registry', icon: Users },
    { id: 'vitals', label: 'Vitals & Clinical X-Rays', icon: Activity },
    { id: 'doctors', label: 'Doctors & Dental Chairs', icon: Stethoscope },
    { id: 'services', label: 'Dental Services & Fees', icon: Sparkles },
    { id: 'branches_users', label: 'Branches & Users', icon: Building2, badge: `${branches.length} Br` },
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

  const getRoleBadgeInfo = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'HQ Super Admin', icon: Crown, color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      case 'BRANCH_ADMIN':
        return { label: 'Branch Admin', icon: ShieldCheck, color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      case 'DOCTOR':
        return { label: 'Doctor', icon: Stethoscope, color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
      case 'RECEPTIONIST':
      default:
        return { label: 'Receptionist', icon: UserCheck, color: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' };
    }
  };

  const currentRoleInfo = getRoleBadgeInfo(currentUser?.role);
  const CurrentRoleIcon = currentRoleInfo.icon;

  const filteredModalUsers = users.filter(u => {
    if (userModalFilter === 'ALL') return true;
    if (userModalFilter === 'SUPER_ADMIN') return u.role === 'SUPER_ADMIN';
    if (userModalFilter === 'BRANCH_ADMIN') return u.role === 'BRANCH_ADMIN';
    if (userModalFilter === 'DOCTOR') return u.role === 'DOCTOR';
    if (userModalFilter === 'RECEPTIONIST') return u.role === 'RECEPTIONIST';
    return u.branch_id === userModalFilter;
  });

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-sm">
      {/* Top Branding & Quick Actions Bar */}
      <div className="w-full px-3 sm:px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Clinic Brand, Logo & Branch Switcher */}
          <div className="flex items-center gap-3">
            <div className="h-10 px-2 py-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-250 dark:border-slate-700/80 shadow-xs flex items-center justify-center shrink-0">
              <img 
                src={settings.clinic_logo_url || '/logo.png'} 
                alt={settings.clinic_name || 'Al Rabeesh Dental'}
                className="h-8 max-h-8 w-auto max-w-[140px] object-contain"
                onError={(e) => {
                  if (e.currentTarget.src !== window.location.origin + '/logo.png' && !e.currentTarget.src.endsWith('/logo.png')) {
                    e.currentTarget.src = '/logo.png';
                  }
                }}
              />
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
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block">
                {settings.clinic_tagline || 'Bahrain & GCC Smart Card Integrated System'}
              </p>
            </div>

            {/* Branch Switcher Badge & Dropdown (Enabled for Super Admin, Locked Badge for Branch Staff) */}
            <div className="relative ml-1 sm:ml-2">
              {isSuperAdmin ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowBranchMenu(!showBranchMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 hover:bg-blue-100/90 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                    title="Super Admin: Click to switch active clinic branch location"
                  >
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                      style={{ backgroundColor: activeBranch?.color || '#2563EB' }}
                    />
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-black text-xs uppercase tracking-wide">{activeBranch?.code || 'MNM'}</span>
                    <span className="hidden md:inline font-semibold text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                      • {activeBranch?.name?.replace('Al Rabeesh ', '') || 'Manama'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                  </button>

                  {/* Branch Selection Dropdown */}
                  {showBranchMenu && (
                    <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          Super Admin: Select Location
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {branches.length} Branches
                        </span>
                      </div>

                      <div className="p-1 space-y-1 max-h-64 overflow-y-auto">
                        {branches.map((b) => {
                          const isSelected = b.id === activeBranchId;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setActiveBranchId(b.id);
                                setShowBranchMenu(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-100'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div 
                                  className="w-3 h-3 rounded-full mt-0.5 shrink-0 shadow-xs"
                                  style={{ backgroundColor: b.color || '#3B82F6' }}
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-xs">{b.name}</span>
                                    <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      {b.code}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px] mt-0.5">
                                    {b.address}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs"
                  title={`Terminal assigned to ${activeBranch?.name}`}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: activeBranch?.color || '#2563EB' }}
                  />
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span className="font-black text-xs uppercase tracking-wide">{activeBranch?.code}</span>
                  <span className="hidden md:inline font-semibold text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                    • {activeBranch?.name?.replace('Al Rabeesh ', '')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Center: Smart Card Reader + New Appointment + Account Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Smart Card Reader Quick Action with Dropdown for Simulator */}
            <div className="relative">
              <div className="inline-flex rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => handleQuickCardRead(false)}
                  disabled={isReadingCard}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-l-xl border transition-all cursor-pointer ${
                    cardReaderStatus === 'CONNECTED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  }`}
                  title="Click to read National CPR Card from USB Reader"
                >
                  <CreditCard className={`w-4 h-4 ${isReadingCard ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">{isReadingCard ? 'Reading...' : 'Scan Smart Card'}</span>
                  <span className="md:hidden">CPR</span>
                  {cardReaderStatus === 'CONNECTED' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSimMenu(!showSimMenu)}
                  className="px-2 py-2 text-xs font-semibold rounded-r-xl border-y border-r border-blue-600 bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center cursor-pointer"
                  title="Smart Card Simulator Presets"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Simulator Dropdown */}
              {showSimMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs">
                  <div className="px-3 py-1 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    Smart Card Quick-Test Presets
                  </div>
                  <button
                    onClick={() => { setShowSimMenu(false); handleQuickCardRead(true, 0); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Abdulla Al-Doseri (Bahraini)</span>
                    <span className="text-[11px] text-slate-500">CPR: 910814992 • Muharraq</span>
                  </button>
                  <button
                    onClick={() => { setShowSimMenu(false); handleQuickCardRead(true, 1); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Maryam Al-Ghatam (Bahraini)</span>
                    <span className="text-[11px] text-slate-500">CPR: 870422119 • Seef</span>
                  </button>
                  <button
                    onClick={() => { setShowSimMenu(false); handleQuickCardRead(true, 2); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col gap-0.5 cursor-pointer"
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
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>

            {/* Offline / Online Sync Badge */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isOnline
                  ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
              }`}
              title="Click to open Live Sync Center & Queue Manager"
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
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Staff & Branch Account Profile Button */}
            <button
              type="button"
              onClick={() => setIsUserLoginModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer group"
              title="Click to switch staff account or branch login"
            >
              <CurrentRoleIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <div className="flex flex-col text-left leading-none">
                <span className="truncate max-w-[110px] sm:max-w-[130px] font-extrabold text-[11px]">
                  {currentUser?.full_name?.split(' ')[0] || 'User'}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {currentRoleInfo.label}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
            </button>

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
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer ${
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

      {/* STAFF & BRANCH ACCOUNT SWITCHER MODAL */}
      {isUserLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Staff & Branch Account Login Switcher
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch active staff persona, branch permissions, and role access in 1 click
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUserLoginModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setUserModalFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  userModalFilter === 'ALL' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Staff ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setUserModalFilter('SUPER_ADMIN')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  userModalFilter === 'SUPER_ADMIN' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                onClick={() => setUserModalFilter('BRANCH_ADMIN')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  userModalFilter === 'BRANCH_ADMIN' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🏢 Branch Admins
              </button>
              <button
                type="button"
                onClick={() => setUserModalFilter('RECEPTIONIST')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  userModalFilter === 'RECEPTIONIST' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📋 Receptionists
              </button>
              <button
                type="button"
                onClick={() => setUserModalFilter('DOCTOR')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  userModalFilter === 'DOCTOR' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🩺 Doctors
              </button>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pt-1">
              {filteredModalUsers.map((u) => {
                const isSelected = u.id === currentUser?.id;
                const userBranch = branches.find(b => b.id === u.branch_id);
                const roleBadge = getRoleBadgeInfo(u.role);
                const RoleIcon = roleBadge.icon;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      loginAsUser(u.id);
                      setIsUserLoginModalOpen(false);
                    }}
                    className={`text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-2xs">
                        <RoleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {u.full_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                          @{u.username}
                        </span>
                        
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <span 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: userBranch?.color || '#F59E0B' }}
                            />
                            {userBranch ? userBranch.name.replace('Al Rabeesh ', '') : 'All Branches (HQ)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase rounded-full shadow-2xs shrink-0">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
              <span className="font-semibold text-[11px]">
                💡 Tip: Super Admin can manage all branches; Branch Admins and Receptionists are assigned to their designated location.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsUserLoginModalOpen(false);
                  setActiveTab('settings');
                }}
                className="font-bold underline text-[11px] text-blue-700 dark:text-blue-300 hover:text-blue-900 cursor-pointer shrink-0 ml-2"
              >
                Manage Staff
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Sync Center & Queue Inspector Modal */}
      <SyncCenterModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </header>
  );
}
