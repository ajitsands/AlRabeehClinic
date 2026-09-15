import React, { useState } from 'react';
import { useApp, BRANCH_REGIONAL_PRESETS } from '../../context/AppContext';
import { 
  Building, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Shield, 
  Crown, 
  Stethoscope, 
  UserCheck, 
  CheckCircle, 
  Sparkles,
  MapPin,
  Phone,
  Hash,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
  Globe,
  Clock,
  DollarSign,
  Check
} from 'lucide-react';

export default function BranchesAndUsersView() {
  const { 
    branches, 
    activeBranchId, 
    setActiveBranchId, 
    saveBranch, 
    users, 
    currentUser, 
    loginAsUser, 
    saveUser, 
    isSuperAdmin,
    settings,
    resetToFreshDemoData, 
    showToast 
  } = useApp();

  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Multi-Branch State
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormCode, setBranchFormCode] = useState('');
  const [branchFormPrefix, setBranchFormPrefix] = useState('');
  const [branchFormAddress, setBranchFormAddress] = useState('');
  const [branchFormPhone, setBranchFormPhone] = useState('');
  const [branchFormColor, setBranchFormColor] = useState('#2563EB');

  // Branch-Level Localization State
  const [branchFormCountry, setBranchFormCountry] = useState('Bahrain');
  const [branchUseCustomLoc, setBranchUseCustomLoc] = useState(false);
  const [branchFormCurrencyCode, setBranchFormCurrencyCode] = useState('BHD');
  const [branchFormCurrencySymbol, setBranchFormCurrencySymbol] = useState('BD');
  const [branchFormCurrencyDecimals, setBranchFormCurrencyDecimals] = useState(3);
  const [branchFormTimezone, setBranchFormTimezone] = useState('Asia/Bahrain');
  const [branchFormDateFormat, setBranchFormDateFormat] = useState('DD/MM/YYYY');

  // Staff & User State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormFullName, setUserFormFullName] = useState('');
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormRole, setUserFormRole] = useState('BRANCH_ADMIN');
  const [userFormBranchId, setUserFormBranchId] = useState('branch-manama');
  const [userFormActive, setUserFormActive] = useState(true);

  // Filters & Tabs
  const [activeSection, setActiveSection] = useState('ALL'); // 'ALL', 'BRANCHES', 'USERS'
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userBranchFilter, setUserBranchFilter] = useState('ALL');

  const handleOpenBranchModal = (br = null) => {
    if (br) {
      setEditingBranch(br);
      setBranchFormName(br.name);
      setBranchFormCode(br.code);
      setBranchFormPrefix(br.prefix);
      setBranchFormAddress(br.address || '');
      setBranchFormPhone(br.phone || '');
      setBranchFormColor(br.color || '#2563EB');
      setBranchFormCountry(br.country || 'Bahrain');

      const hasCustom = Boolean(br.currency_code || br.currency_symbol || br.timezone);
      setBranchUseCustomLoc(hasCustom);
      setBranchFormCurrencyCode(br.currency_code || settings.currency_code || 'BHD');
      setBranchFormCurrencySymbol(br.currency_symbol || settings.currency_symbol || 'BD');
      setBranchFormCurrencyDecimals(br.currency_decimals !== undefined && br.currency_decimals !== null ? br.currency_decimals : (settings.currency_decimals ?? 3));
      setBranchFormTimezone(br.timezone || settings.timezone || 'Asia/Bahrain');
      setBranchFormDateFormat(br.date_format || settings.date_format || 'DD/MM/YYYY');
    } else {
      setEditingBranch(null);
      setBranchFormName('');
      setBranchFormCode('');
      setBranchFormPrefix('');
      setBranchFormAddress('');
      setBranchFormPhone('');
      setBranchFormColor('#10B981');
      setBranchFormCountry('Bahrain');
      setBranchUseCustomLoc(false);
      setBranchFormCurrencyCode(settings.currency_code || 'BHD');
      setBranchFormCurrencySymbol(settings.currency_symbol || 'BD');
      setBranchFormCurrencyDecimals(settings.currency_decimals ?? 3);
      setBranchFormTimezone(settings.timezone || 'Asia/Bahrain');
      setBranchFormDateFormat(settings.date_format || 'DD/MM/YYYY');
    }
    setBranchModalOpen(true);
  };

  const handleApplyBranchPreset = (preset) => {
    setBranchFormCountry(preset.country);
    setBranchUseCustomLoc(true);
    setBranchFormCurrencyCode(preset.code);
    setBranchFormCurrencySymbol(preset.symbol);
    setBranchFormCurrencyDecimals(preset.decimals);
    setBranchFormTimezone(preset.timezone);
    setBranchFormDateFormat(preset.dateFormat);
    if (!branchFormPhone && preset.phonePrefix) {
      setBranchFormPhone(`${preset.phonePrefix} `);
    }
    showToast(`Applied ${preset.flag} ${preset.country} localization preset`, 'info');
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchFormName || !branchFormCode || !branchFormPrefix) {
      showToast('Please fill in Branch Name, Code, and Patient Prefix', 'error');
      return;
    }

    const branchData = {
      id: editingBranch ? editingBranch.id : `branch-${branchFormCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      name: branchFormName.trim(),
      code: branchFormCode.toUpperCase().trim(),
      prefix: branchFormPrefix.toUpperCase().trim(),
      address: branchFormAddress.trim(),
      phone: branchFormPhone.trim(),
      color: branchFormColor,
      country: branchFormCountry,
      currency_code: branchUseCustomLoc ? branchFormCurrencyCode.trim().toUpperCase() : null,
      currency_symbol: branchUseCustomLoc ? branchFormCurrencySymbol.trim() : null,
      currency_decimals: branchUseCustomLoc ? Number(branchFormCurrencyDecimals) : null,
      timezone: branchUseCustomLoc ? branchFormTimezone.trim() : null,
      date_format: branchUseCustomLoc ? branchFormDateFormat.trim() : null,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    await saveBranch(branchData);
    setBranchModalOpen(false);
  };

  const handleOpenUserModal = (u = null) => {
    if (u) {
      setEditingUser(u);
      setUserFormFullName(u.full_name || '');
      setUserFormUsername(u.username || '');
      setUserFormRole(u.role || 'BRANCH_ADMIN');
      setUserFormBranchId(u.branch_id || 'branch-manama');
      setUserFormActive(u.is_active !== false);
    } else {
      setEditingUser(null);
      setUserFormFullName('');
      setUserFormUsername('');
      setUserFormRole('BRANCH_ADMIN');
      setUserFormBranchId(activeBranchId || 'branch-manama');
      setUserFormActive(true);
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormFullName || !userFormUsername) {
      showToast('Please provide full name and username', 'error');
      return;
    }

    const userData = {
      id: editingUser ? editingUser.id : `usr-${userFormUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      username: userFormUsername.toLowerCase().trim(),
      full_name: userFormFullName.trim(),
      role: userFormRole,
      branch_id: userFormRole === 'SUPER_ADMIN' ? null : userFormBranchId,
      is_active: userFormActive,
      updated_at: new Date().toISOString()
    };

    await saveUser(userData);
    setUserModalOpen(false);
  };

  const filteredUsers = users?.filter(u => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userBranchFilter !== 'ALL') {
      if (userBranchFilter === 'GLOBAL' && u.role !== 'SUPER_ADMIN') return false;
      if (userBranchFilter !== 'GLOBAL' && u.branch_id !== userBranchFilter) return false;
    }
    return true;
  }) || [];

  return (
    <div className="w-full flex justify-center">
      <div className="space-y-5 w-full max-w-[1720px] px-2 sm:px-4 lg:px-6 py-2">
        
        {/* Header Bar with Sub-View Switcher & Quick Action Buttons */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Branches & Staff Role Management
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                  {branches.length} Branches • {users?.length || 0} Staff
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure clinic branches, collision-free offline file numbering, and staff role permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveSection('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSection === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('BRANCHES')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSection === 'BRANCHES'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Branches ({branches.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('USERS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSection === 'USERS'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Staff Users ({users?.length || 0})
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBranchModal()}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenUserModal()}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isResetting}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Reset all demo data to fresh clean multi-branch state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: CLINIC BRANCH LOCATIONS & OFFLINE NUMBERING */}
        {(activeSection === 'ALL' || activeSection === 'BRANCHES') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Clinic Branch Locations & Collision-Free Prefixes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Each branch generates distinct offline patient numbers (e.g. ARB-MNM, ARB-RFA) preventing sync duplicates
                  </p>
                </div>
              </div>

              {/* Terminal Active Selector */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Terminal Branch:</span>
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer focus:ring-1 focus:ring-blue-500"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {branches.map(b => {
                const isTerminalActive = activeBranchId === b.id;
                const branchStaffCount = users?.filter(u => u.branch_id === b.id).length || 0;
                const branchPreset = BRANCH_REGIONAL_PRESETS.find(p => p.country === b.country) || BRANCH_REGIONAL_PRESETS[0];

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isTerminalActive
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-800/30'
                    }`}
                    style={{ borderTop: `4px solid ${b.color || '#3B82F6'}` }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                          {b.prefix}
                        </span>
                        {isTerminalActive && (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            Active Terminal
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {b.name}
                      </h4>
                      
                      <div className="mt-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{b.address || 'No address specified'}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{b.phone || 'N/A'}</span>
                        </p>
                      </div>

                      {/* Regional Localization Badges */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <span>{branchPreset.flag}</span>
                          <span>{b.country || 'Bahrain'}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {b.currency_symbol || settings.currency_symbol || 'BD'} ({b.currency_decimals !== null && b.currency_decimals !== undefined ? b.currency_decimals : (settings.currency_decimals ?? 3)} dec)
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {b.timezone || settings.timezone || 'Asia/Bahrain'}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>Staff Assigned:</span>
                        <span className="text-slate-800 dark:text-slate-200">{branchStaffCount} staff</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveBranchId(b.id)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isTerminalActive ? '● Active Terminal' : 'Set as Active'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenBranchModal(b)}
                        className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        Edit Branch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: STAFF ACCOUNTS & ROLE-BASED ACCESS CONTROL */}
        {(activeSection === 'ALL' || activeSection === 'USERS') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Header & Role/Branch Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Staff Accounts & Role Permissions</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full">
                      {filteredUsers.length} shown
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Super Admin (All Branches), Branch Admins, Receptionists, and Doctors
                  </p>
                </div>
              </div>

              {/* Quick Role & Branch Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-500">Role:</span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="SUPER_ADMIN">👑 Super Admin</option>
                    <option value="BRANCH_ADMIN">🏢 Branch Admin</option>
                    <option value="DOCTOR">🩺 Doctor</option>
                    <option value="RECEPTIONIST">📋 Receptionist</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-500">Branch:</span>
                  <select
                    value={userBranchFilter}
                    onChange={(e) => setUserBranchFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
                  >
                    <option value="ALL">All Branches</option>
                    <option value="GLOBAL">👑 Global / HQ</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Staff Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredUsers.map(u => {
                const isMe = currentUser?.id === u.id;
                const branchObj = branches.find(b => b.id === u.branch_id);
                
                const roleBadgeClass = {
                  SUPER_ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
                  BRANCH_ADMIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
                  DOCTOR: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
                  RECEPTIONIST: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-900',
                }[u.role] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isMe
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${roleBadgeClass}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                        {isMe ? (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-600 text-white shadow-xs">
                            Active User
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${u.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {u.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {u.full_name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        @{u.username}
                      </p>

                      <div className="mt-2.5 text-[11px] flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {u.role === 'SUPER_ADMIN' ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">All Branches (Global Access)</span>
                          ) : branchObj ? (
                            <span>{branchObj.name} ({branchObj.code})</span>
                          ) : (
                            <span className="text-slate-400">Unassigned Branch</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      {!isMe ? (
                        <button
                          type="button"
                          onClick={() => loginAsUser(u.id)}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>Switch to this user</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          Current Logged In
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenUserModal(u)}
                        className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        Edit Account
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* BRANCH CREATE / EDIT MODAL WITH REGIONAL LOCALIZATION */}
      {branchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {editingBranch ? 'Edit Clinic Branch & Localization' : 'Add New Clinic Branch & Localization'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure branch identification, operating currency, and regional timezone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBranchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4 text-xs overflow-y-auto pr-1">
              
              {/* SECTION 1: BRANCH IDENTITY */}
              <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Branch Identity</span>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchFormName}
                    onChange={(e) => setBranchFormName(e.target.value)}
                    placeholder="e.g. Al Rabeesh Kuwait Salmiya Branch"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white"
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
                      placeholder="e.g. KWT, MNM, RFA"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Patient Prefix *
                    </label>
                    <input
                      type="text"
                      required
                      value={branchFormPrefix}
                      onChange={(e) => setBranchFormPrefix(e.target.value)}
                      placeholder="e.g. ARB-KWT, ARB-MNM"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-mono uppercase font-bold text-blue-600 dark:text-blue-400"
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
                      placeholder="e.g. +965 2200 1122"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white"
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
                      className="w-full h-9 rounded-xl cursor-pointer p-0.5 bg-white dark:bg-slate-900 border"
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
                    placeholder="e.g. Salem Al Mubarak St, Salmiya, Kuwait"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* SECTION 2: BRANCH LOCALIZATION & REGIONAL PRESETS */}
              <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/50 pb-2.5">
                  <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200 font-extrabold text-xs uppercase tracking-wider">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Branch Localization (Currency & Timezone)</span>
                  </div>

                  {/* Toggle: Inherit vs Custom */}
                  <button
                    type="button"
                    onClick={() => setBranchUseCustomLoc(!branchUseCustomLoc)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                      branchUseCustomLoc
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{branchUseCustomLoc ? '✓ Custom Branch Settings' : '○ Inherit Global Clinic Settings'}</span>
                  </button>
                </div>

                {/* Country Quick Presets */}
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                    1-Click Regional Presets (Kuwait, Bahrain, Saudi, UAE, India, etc.):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BRANCH_REGIONAL_PRESETS.map((preset) => {
                      const isSelected = branchFormCountry === preset.country && branchUseCustomLoc;
                      return (
                        <button
                          key={preset.country}
                          type="button"
                          onClick={() => handleApplyBranchPreset(preset)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{preset.flag}</span>
                          <span>{preset.country}</span>
                          <span className="text-[10px] opacity-75 font-mono">({preset.symbol})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Localization Inputs (Disabled when inheriting clinic defaults) */}
                {branchUseCustomLoc ? (
                  <div className="space-y-3 pt-2 border-t border-blue-100 dark:border-blue-900/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Currency Code
                        </label>
                        <input
                          type="text"
                          value={branchFormCurrencyCode}
                          onChange={(e) => setBranchFormCurrencyCode(e.target.value.toUpperCase())}
                          placeholder="e.g. KWD, BHD, SAR"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold uppercase text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Currency Symbol
                        </label>
                        <input
                          type="text"
                          value={branchFormCurrencySymbol}
                          onChange={(e) => setBranchFormCurrencySymbol(e.target.value)}
                          placeholder="e.g. KD, BD, SAR"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Decimals
                        </label>
                        <select
                          value={branchFormCurrencyDecimals}
                          onChange={(e) => setBranchFormCurrencyDecimals(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white"
                        >
                          <option value={3}>3 Decimals (KWD, BHD, OMR)</option>
                          <option value={2}>2 Decimals (SAR, AED, INR, USD)</option>
                          <option value={0}>0 Decimals (JPY)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Branch Timezone
                        </label>
                        <select
                          value={branchFormTimezone}
                          onChange={(e) => setBranchFormTimezone(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white"
                        >
                          <option value="Asia/Kuwait">🇰🇼 Asia/Kuwait (GMT+3)</option>
                          <option value="Asia/Bahrain">🇧🇭 Asia/Bahrain (GMT+3)</option>
                          <option value="Asia/Riyadh">🇸🇦 Asia/Riyadh (GMT+3)</option>
                          <option value="Asia/Dubai">🇦🇪 Asia/Dubai (GMT+4)</option>
                          <option value="Asia/Qatar">🇶🇦 Asia/Qatar (GMT+3)</option>
                          <option value="Asia/Muscat">🇴🇲 Asia/Muscat (GMT+4)</option>
                          <option value="Asia/Kolkata">🇮🇳 Asia/Kolkata (GMT+5:30)</option>
                          <option value="UTC">🌐 UTC (Universal)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Date Format
                        </label>
                        <select
                          value={branchFormDateFormat}
                          onChange={(e) => setBranchFormDateFormat(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-slate-900 dark:text-white"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/09/2026)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-15)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/15/2026)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-dashed border-blue-300 dark:border-blue-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Inheriting Global Clinic Settings:</strong> Currency <span className="font-bold text-blue-600 dark:text-blue-400">{settings.currency_symbol || 'BD'} ({settings.currency_decimals ?? 3} decimals)</span>, Timezone <span className="font-bold">{settings.timezone || 'Asia/Bahrain'}</span>, Date <span className="font-bold">{settings.date_format || 'DD/MM/YYYY'}</span>.
                    </span>
                  </div>
                )}
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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Save Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER CREATE / EDIT MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingUser ? 'Edit Staff Account' : 'Add New Staff Member'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={userFormFullName}
                  onChange={(e) => setUserFormFullName(e.target.value)}
                  placeholder="e.g. Dr. Salman Al-Khalifa"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Username / Login ID *
                </label>
                <input
                  type="text"
                  required
                  value={userFormUsername}
                  onChange={(e) => setUserFormUsername(e.target.value)}
                  placeholder="e.g. salman.khalifa"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Access Role *
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="SUPER_ADMIN">👑 Super Admin (All Branches)</option>
                    <option value="BRANCH_ADMIN">🏢 Branch Admin</option>
                    <option value="DOCTOR">🩺 Doctor / Specialist</option>
                    <option value="RECEPTIONIST">📋 Receptionist</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Assigned Branch {userFormRole === 'SUPER_ADMIN' ? '(Global)' : '*'}
                  </label>
                  <select
                    disabled={userFormRole === 'SUPER_ADMIN'}
                    value={userFormRole === 'SUPER_ADMIN' ? '' : userFormBranchId}
                    onChange={(e) => setUserFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white disabled:opacity-50 cursor-pointer"
                  >
                    {userFormRole === 'SUPER_ADMIN' ? (
                      <option value="">All Branches</option>
                    ) : (
                      branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormActive}
                    onChange={(e) => setUserFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Account is Active & Permitted to Login
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Save Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  Reset to Fresh Demo Data?
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
