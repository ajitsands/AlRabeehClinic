import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, initializeDatabase, seedFreshMultiBranchData } from '../db/indexedDB';
import { smartCardService } from '../services/smartCardReader';
import { syncEngine } from '../services/syncEngine';

// Helper to generate dynamic clinic time slots
export function generateClinicTimeSlots(openTime = '09:00', closeTime = '17:30', intervalMins = 30) {
  const slots = [];
  const [openH, openM] = (openTime || '09:00').split(':').map(Number);
  const [closeH, closeM] = (closeTime || '17:30').split(':').map(Number);

  let currentTotalMins = openH * 60 + openM;
  const closeTotalMins = closeH * 60 + closeM;

  while (currentTotalMins < closeTotalMins) {
    const h = Math.floor(currentTotalMins / 60);
    const m = currentTotalMins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(timeStr);
    currentTotalMins += Number(intervalMins) || 30;
  }

  return slots.length > 0 ? slots : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
}

// Helper to check if a slot falls within break time
export function isSlotInBreak(timeSlot, settings) {
  if (!settings?.break_enabled || !settings?.break_start_time || !settings?.break_end_time) {
    return false;
  }
  const [sH, sM] = timeSlot.split(':').map(Number);
  const slotMins = sH * 60 + sM;

  const [bStartH, bStartM] = settings.break_start_time.split(':').map(Number);
  const breakStartMins = bStartH * 60 + bStartM;

  const [bEndH, bEndM] = settings.break_end_time.split(':').map(Number);
  const breakEndMins = bEndH * 60 + bEndM;

  return slotMins >= breakStartMins && slotMins < breakEndMins;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'patients' | 'vitals' | 'doctors' | 'services' | 'settings'
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // Users & Role State
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState({
    id: 'user-superadmin',
    username: 'superadmin',
    full_name: 'Dr. Tariq Al Rabeesh (HQ Owner)',
    role: 'SUPER_ADMIN',
    branch_id: null
  });

  // Multi-Branch State
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchIdState] = useState(
    localStorage.getItem('clinic_active_branch') || 'branch-mnm'
  );

  // Computed helper: Is current user Super Admin
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Active User Role for backwards compatibility
  const activeUserRole = currentUser?.role || 'SUPER_ADMIN';
  const setActiveUserRole = (role) => {
    setCurrentUser(prev => ({ ...prev, role }));
  };

  // Settings state with Operating Hours and Break Time
  const [settings, setSettings] = useState({
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
    clinic_address: 'Road 3821, Block 338, Manama, Kingdom of Bahrain'
  });

  // Smart Card Reader state
  const [cardReaderStatus, setCardReaderStatus] = useState('DISCONNECTED'); // 'CONNECTED' | 'DISCONNECTED' | 'READING' | 'ERROR'
  const [lastScannedCard, setLastScannedCard] = useState(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Sync state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info', duration = 3500) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, duration);
  };

  // Active Branch Computed Object
  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0] || {
    id: 'branch-mnm',
    code: 'MNM',
    name: 'Manama Flagship Center',
    prefix: 'ARB-MNM',
    color: '#2563EB'
  };

  // Change Active Branch (Available for Super Admin or when logging in)
  const changeActiveBranch = (branchId, force = false) => {
    if (!force && !isSuperAdmin && currentUser?.branch_id && currentUser.branch_id !== branchId) {
      showToast(`Access restricted: Your account is assigned to ${branches.find(b => b.id === currentUser.branch_id)?.name || 'your home branch'}`, 'warning');
      return;
    }
    setActiveBranchIdState(branchId);
    localStorage.setItem('clinic_active_branch', branchId);
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      showToast(`Active Branch: ${branch.name} (${branch.code})`, 'info');
    }
  };

  // Load Users from Database
  const refreshUsers = async () => {
    try {
      const allUsers = await db.users.toArray();
      setUsers(allUsers);
      const savedUserId = localStorage.getItem('clinic_current_user_id');
      if (savedUserId) {
        const found = allUsers.find(u => u.id === savedUserId);
        if (found) {
          setCurrentUser(found);
          if (found.branch_id) {
            setActiveBranchIdState(found.branch_id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  // Switch / Login as User
  const loginAsUser = (userId) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    
    setCurrentUser(targetUser);
    localStorage.setItem('clinic_current_user_id', targetUser.id);
    
    if (targetUser.branch_id) {
      changeActiveBranch(targetUser.branch_id, true);
    }
    
    const roleLabels = {
      SUPER_ADMIN: '👑 Super Admin (HQ)',
      BRANCH_ADMIN: '🏢 Branch Admin',
      DOCTOR: '🩺 Doctor',
      RECEPTIONIST: '📋 Receptionist'
    };
    
    showToast(`Logged in as ${targetUser.full_name} (${roleLabels[targetUser.role] || targetUser.role})`, 'success');
  };

  // Create or Update User
  const saveUser = async (userData) => {
    const isNew = !userData.id;
    const userId = userData.id || `user-${Date.now()}`;
    const cleanUser = {
      ...userData,
      id: userId,
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      updated_at: new Date().toISOString()
    };

    await db.users.put(cleanUser);
    await syncEngine.queueChange('users', userId, isNew ? 'INSERT' : 'UPDATE', cleanUser);
    await refreshUsers();
    showToast(`User account ${cleanUser.full_name} saved successfully`, 'success');
  };

  // Load and refresh branches from IndexedDB
  const refreshBranches = async () => {
    try {
      const allBranches = await db.branches.toArray();
      setBranches(allBranches);
      if (allBranches.length > 0 && !allBranches.some(b => b.id === activeBranchId)) {
        setActiveBranchIdState(allBranches[0].id);
      }
    } catch (e) {
      console.error('Failed to load branches:', e);
    }
  };

  // Add or update branch
  const saveBranch = async (branchData) => {
    const isNew = !branchData.id;
    const branchId = branchData.id || `branch-${Date.now()}`;
    const cleanBranch = {
      ...branchData,
      id: branchId,
      code: (branchData.code || 'BRN').toUpperCase().trim(),
      prefix: (branchData.prefix || `ARB-${branchData.code}`).toUpperCase().trim(),
      is_active: branchData.is_active !== undefined ? branchData.is_active : true
    };

    await db.branches.put(cleanBranch);
    await syncEngine.queueChange('branches', branchId, isNew ? 'INSERT' : 'UPDATE', cleanBranch);
    await refreshBranches();
    showToast(`Branch ${cleanBranch.name} saved successfully`, 'success');
  };

  // Generate Collision-Free Smart Branch-Prefixed File Number (e.g. ARB-MNM-26-0005)
  const generateBranchFileNumber = async (branchId = activeBranchId) => {
    try {
      const targetBranch = branches.find(b => b.id === branchId) || activeBranch;
      const prefix = targetBranch?.prefix || `ARB-${targetBranch?.code || 'MNM'}`;
      const yearShort = new Date().getFullYear().toString().slice(-2); // e.g. "26"

      // Count existing patients for this branch prefix
      const count = await db.patients.where('home_branch_id').equals(branchId).count();
      const nextSeq = String(count + 1).padStart(4, '0');
      return `${prefix}-${yearShort}-${nextSeq}`;
    } catch (e) {
      const yearShort = new Date().getFullYear().toString().slice(-2);
      return `ARB-GEN-${yearShort}-${Date.now().toString().slice(-4)}`;
    }
  };

  // 1-Click Database Reset to Fresh Multi-Branch Demo Data
  const resetToFreshDemoData = async () => {
    try {
      await seedFreshMultiBranchData();
      await refreshBranches();
      await refreshUsers();
      const savedSettings = await db.settings.get('clinic_settings');
      if (savedSettings) {
        setSettings(savedSettings);
        setTheme(savedSettings.theme || 'light');
      }
      setActiveBranchIdState('branch-mnm');
      setCurrentUser({
        id: 'usr-superadmin',
        username: 'superadmin',
        full_name: 'Dr. Tariq Al Rabeesh (Executive Director)',
        role: 'SUPER_ADMIN',
        branch_id: null
      });
      showToast('Database reset! Fresh multi-branch demo data loaded successfully.', 'success');
      return true;
    } catch (err) {
      showToast(`Database reset failed: ${err.message}`, 'error');
      return false;
    }
  };

  // Initialize DB, Load Settings, Users and Branches
  useEffect(() => {
    async function setup() {
      await initializeDatabase();
      await refreshBranches();
      await refreshUsers();

      const savedSettings = await db.settings.get('clinic_settings');
      if (savedSettings) {
        setSettings(savedSettings);
        setTheme(savedSettings.theme || 'light');
        if (savedSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Set default branch if not set in local storage
        if (!localStorage.getItem('clinic_active_branch') && savedSettings.default_branch_id) {
          setActiveBranchIdState(savedSettings.default_branch_id);
        }
      }

      // Check initial pending sync
      const count = await syncEngine.getPendingCount();
      setPendingSyncCount(count);

      // Connect to local Smart Card Reader
      try {
        await smartCardService.connect(savedSettings?.reader_ws_url || 'ws://localhost:5060/SCardRead');
      } catch (e) {
        console.log('SmartCard Reader local daemon not reachable on start, fallback mode active.');
      }
    }
    setup();
  }, []);

  // Listen for Smart Card & Sync Events
  useEffect(() => {
    const unsubCardConn = smartCardService.on('connectionChange', (data) => {
      setCardReaderStatus(data.status);
    });

    const unsubCardStart = smartCardService.on('readingStart', () => {
      setCardReaderStatus('READING');
    });

    const unsubCardSuccess = smartCardService.on('readSuccess', (cardData) => {
      setCardReaderStatus('CONNECTED');
      setLastScannedCard(cardData);
      showToast(`Smart Card Read Successful: ${cardData.full_name_en} (CPR: ${cardData.cpr_number})`, 'success');
    });

    const unsubCardError = smartCardService.on('readError', (err) => {
      setCardReaderStatus('CONNECTED');
      showToast(`Smart Card Read Failed: ${err.message || 'Error communicating with card'}`, 'error');
    });

    const unsubNetwork = syncEngine.on('networkChange', ({ isOnline }) => {
      setIsOnline(isOnline);
      showToast(isOnline ? 'Internet connected. Synchronizing...' : 'Operating in Offline Mode (Local SQLite/IndexedDB active).', isOnline ? 'success' : 'warning');
    });

    const unsubSyncStart = syncEngine.on('syncStart', () => setIsSyncing(true));
    const unsubSyncSuccess = syncEngine.on('syncSuccess', ({ pendingCount, syncedCount, message }) => {
      setIsSyncing(false);
      setPendingSyncCount(pendingCount);
      if (syncedCount > 0) {
        showToast(message || `Synchronized ${syncedCount} records with cloud server`, 'success');
      }
    });
    const unsubSyncError = syncEngine.on('syncError', ({ error, pendingCount }) => {
      setIsSyncing(false);
      setPendingSyncCount(pendingCount);
      showToast(`Sync notice: ${error}. ${pendingCount} records stored securely in local database.`, 'info');
    });
    const unsubOutbox = syncEngine.on('outboxUpdated', (count) => {
      setPendingSyncCount(count);
    });

    return () => {
      unsubCardConn();
      unsubCardStart();
      unsubCardSuccess();
      unsubCardError();
      unsubNetwork();
      unsubSyncStart();
      unsubSyncSuccess();
      unsubSyncError();
      unsubOutbox();
    };
  }, []);

  // Toggle Theme
  const toggleTheme = async (newTheme) => {
    const targetTheme = newTheme || (theme === 'light' ? 'dark' : 'light');
    setTheme(targetTheme);
    if (targetTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const updated = { ...settings, theme: targetTheme };
    setSettings(updated);
    await db.settings.put(updated);
  };

  // Update System Settings
  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await db.settings.put(updated);
    if (newSettings.theme && newSettings.theme !== theme) {
      toggleTheme(newSettings.theme);
    }
    showToast('System settings updated successfully', 'success');
  };

  // Format Currency according to settings (e.g. BD 25.500 for Bahrain 3 decimals, or ₹ 500.00 for India)
  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    const decimals = settings.currency_decimals !== undefined ? settings.currency_decimals : 3;
    const formattedNum = num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${settings.currency_symbol || 'BD'} ${formattedNum}`;
  };

  // Format Date according to settings (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
  const formatDate = (dateInput) => {
    if (!dateInput) return '-';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      switch (settings.date_format) {
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'DD/MM/YYYY':
        default:
          return `${day}/${month}/${year}`;
      }
    } catch {
      return String(dateInput);
    }
  };

  // Trigger Smart Card Read (Real or Simulation fallback)
  const triggerSmartCardRead = async (useSimulation = false, presetIndex = 0) => {
    try {
      if (useSimulation) {
        return await smartCardService.simulateCardRead(presetIndex);
      }
      return await smartCardService.readSmartCard();
    } catch (err) {
      console.warn('Physical card read failed, opening simulator fallback option', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedPatientId,
        setSelectedPatientId,
        currentUser,
        users,
        loginAsUser,
        saveUser,
        refreshUsers,
        isSuperAdmin,
        activeUserRole,
        setActiveUserRole,
        branches,
        activeBranchId,
        activeBranch,
        setActiveBranchId: changeActiveBranch,
        refreshBranches,
        saveBranch,
        generateBranchFileNumber,
        theme,
        toggleTheme,
        settings,
        updateSettings,
        cardReaderStatus,
        lastScannedCard,
        setLastScannedCard,
        isCardModalOpen,
        setIsCardModalOpen,
        triggerSmartCardRead,
        isOnline,
        isSyncing,
        pendingSyncCount,
        syncNow: (opts) => syncEngine.syncNow(opts),
        clearOutbox: () => syncEngine.clearOutbox(),
        testConnection: (url) => syncEngine.testConnection(url),
        getPendingSyncItems: () => syncEngine.getPendingItems(),
        syncEngine,
        resetToFreshDemoData,
        toast,
        showToast,
        formatCurrency,
        formatDate
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
