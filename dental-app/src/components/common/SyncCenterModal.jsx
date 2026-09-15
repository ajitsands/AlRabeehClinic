import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  RefreshCw, 
  Server, 
  Wifi, 
  WifiOff, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Download, 
  Play, 
  Info,
  Clock,
  Layers,
  ArrowUpRight,
  Sparkles,
  Check,
  AlertTriangle,
  FileText,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export default function SyncCenterModal({ isOpen, onClose }) {
  const { 
    isOnline, 
    isSyncing, 
    pendingSyncCount, 
    syncNow, 
    clearOutbox, 
    testConnection, 
    getPendingSyncItems,
    syncEngine,
    showToast,
    formatDate
  } = useApp();

  const [targetUrl, setTargetUrl] = useState(syncEngine.getApiUrl());
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'server' | 'instructions'
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  // Beautiful Custom Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'CLEAR' | 'SIMULATE', title, message, warning }

  // Load pending items when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPendingList();
      setTargetUrl(syncEngine.getApiUrl());
      setTestResult(null);
      setSyncStatusMsg(null);
      setConfirmDialog(null);
    }
  }, [isOpen, pendingSyncCount]);

  const loadPendingList = async () => {
    if (getPendingSyncItems) {
      const items = await getPendingSyncItems();
      setPendingItems(items || []);
    }
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(targetUrl);
      setTestResult(result);
      if (result.ok) {
        showToast(`Server online! Latency: ${result.pingMs}ms`, 'success');
      } else {
        showToast(`Connection check failed: ${result.message}`, 'warning');
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message || 'Unknown error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveUrl = () => {
    syncEngine.setApiUrl(targetUrl);
    showToast('Sync API URL updated', 'success');
    handleTestConnection();
  };

  const handleTriggerSync = async () => {
    setIsSyncingLocal(true);
    setSyncStatusMsg(null);
    try {
      const result = await syncNow();
      if (result?.success) {
        setSyncStatusMsg({ 
          type: 'success', 
          text: result.message || `Successfully synced ${result.count || 0} records.` 
        });
        await loadPendingList();
      } else {
        setSyncStatusMsg({ 
          type: 'error', 
          text: result?.error || 'Sync failed. Server might be offline or endpoint misconfigured. Local data is safely retained.' 
        });
      }
    } catch (e) {
      setSyncStatusMsg({ type: 'error', text: e.message });
    } finally {
      setIsSyncingLocal(false);
      await loadPendingList();
    }
  };

  // Open modern confirm dialog for Simulate Sync
  const promptSimulateSync = () => {
    setConfirmDialog({
      type: 'SIMULATE',
      title: 'Simulate Server Sync & Clear Badge',
      message: `Are you sure you want to simulate synchronization for all ${pendingSyncCount} pending records?`,
      details: 'This will mark all outbox items as processed and reset your pending count to 0. All patient data, appointments, and doctors remain 100% intact in your local database.',
      confirmText: 'Yes, Simulate & Reset Count',
      confirmColor: 'purple'
    });
  };

  // Open modern confirm dialog for Clear Outbox
  const promptClearOutbox = () => {
    setConfirmDialog({
      type: 'CLEAR',
      title: 'Clear Outbox Sync Queue',
      message: `Are you sure you want to clear all ${pendingSyncCount} pending items from the outbox?`,
      details: 'All changes remain safely stored in your local clinic database. They will simply be dismissed from the cloud synchronization queue.',
      confirmText: 'Yes, Clear Outbox Queue',
      confirmColor: 'rose'
    });
  };

  // Execute Confirmed Action
  const handleExecuteConfirmedAction = async () => {
    if (!confirmDialog) return;
    const actionType = confirmDialog.type;
    setConfirmDialog(null);

    if (actionType === 'SIMULATE') {
      setIsSyncingLocal(true);
      try {
        const result = await syncNow({ forceMock: true });
        showToast(result?.message || 'Simulated sync completed.', 'success');
        setSyncStatusMsg({ type: 'success', text: 'Simulated sync successfully processed. Outbox count reset to 0.' });
        await loadPendingList();
      } finally {
        setIsSyncingLocal(false);
      }
    } else if (actionType === 'CLEAR') {
      setIsClearing(true);
      try {
        await clearOutbox();
        await loadPendingList();
        showToast('Outbox queue cleared successfully', 'info');
        setSyncStatusMsg({ type: 'info', text: 'Outbox queue has been cleared.' });
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pendingItems, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `clinic_sync_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Backup JSON exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export backup', 'error');
    }
  };

  // Group summary by entity
  const entityCounts = pendingItems.reduce((acc, item) => {
    acc[item.entityType] = (acc[item.entityType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Live Synchronization & Server Center
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                  isOnline 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isOnline ? 'Network Online' : 'Network Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Offline-First SQLite/Dexie Engine with Two-Way MySQL Cloud Synchronization
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Message Banner */}
        {syncStatusMsg && (
          <div className={`px-6 py-3 text-xs flex items-center justify-between border-b ${
            syncStatusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : syncStatusMsg.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">{syncStatusMsg.text}</span>
            </div>
            <button 
              onClick={() => setSyncStatusMsg(null)}
              className="text-xs font-bold hover:underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Pending Outbox Queue</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold text-[10px]">
              {pendingSyncCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'server'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Server Endpoint & Test</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'instructions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Server Deployment Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: PENDING QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Total Pending
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {pendingSyncCount}
                    </span>
                    <span className="text-xs text-slate-500">records</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Last Cloud Sync
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-700 dark:text-slate-200 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{syncEngine.lastSyncTime ? new Date(syncEngine.lastSyncTime).toLocaleTimeString() : 'Not Synced Yet'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Local Database
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dexie (IndexedDB) OK</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Queue Breakdown
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.keys(entityCounts).length > 0 ? (
                      Object.entries(entityCounts).map(([entity, count]) => (
                        <span key={entity} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {entity}: {count}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Queue Empty</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750">
                <div className="flex items-center gap-2">
                  {/* Primary Sync Button */}
                  <button
                    onClick={handleTriggerSync}
                    disabled={isSyncing || isSyncingLocal}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isSyncingLocal ? 'animate-spin' : ''}`} />
                    <span>{isSyncing || isSyncingLocal ? 'Syncing with Cloud...' : 'Push to Cloud Server'}</span>
                  </button>

                  {/* Simulate Sync (Fallback if remote server offline) */}
                  <button
                    onClick={promptSimulateSync}
                    disabled={isSyncing || isSyncingLocal || pendingSyncCount === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    title="Marks current queue as synced and clears outbox count"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Simulate Sync (Clear Count)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Export Backup JSON */}
                  <button
                    onClick={handleExportBackup}
                    disabled={pendingItems.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    title="Export pending records to JSON file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Backup</span>
                  </button>

                  {/* Clear Outbox */}
                  <button
                    onClick={promptClearOutbox}
                    disabled={isClearing || pendingSyncCount === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    title="Delete pending items from outbox queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Outbox</span>
                  </button>
                </div>
              </div>

              {/* Pending Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pending Outbox Queue Items ({pendingItems.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Records waiting to be pushed to MySQL
                  </span>
                </div>

                {pendingItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Outbox is completely clear!</p>
                    <p className="text-xs text-slate-400 mt-1">All local changes are up-to-date or already synchronized.</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingItems.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 text-slate-400 font-mono text-[11px] text-right">
                            #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            item.operation === 'INSERT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            item.operation === 'UPDATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {item.operation}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                            {item.entityType}
                          </span>
                          <span className="text-slate-500 truncate max-w-xs font-mono text-[11px]">
                            ID: {item.entityId}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[10px] border border-amber-200 dark:border-amber-800">
                            PENDING
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SERVER ENDPOINT CONFIGURATION & TEST */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Cloud Backend Sync API Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://alrabeesh.sandslab.com/backend/api/sync.php"
                    className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSaveUrl}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Save URL
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>

                {/* Preset Buttons */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500 font-medium">Quick Presets:</span>
                  <button
                    onClick={() => { setTargetUrl('https://alrabeesh.sandslab.com/backend/api/sync.php'); }}
                    className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-300 cursor-pointer"
                  >
                    Production (sandslab.com)
                  </button>
                  <button
                    onClick={() => { setTargetUrl('http://localhost:8000/backend/api/sync.php'); }}
                    className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-300 cursor-pointer"
                  >
                    Local PHP Server (Port 8000)
                  </button>
                </div>
              </div>

              {/* Test Result Box */}
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  testResult.ok 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                      <span>{testResult.ok ? 'Connection Successful' : 'Connection Test Failed'}</span>
                    </div>
                    {testResult.pingMs !== undefined && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">
                        {testResult.pingMs} ms
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {testResult.message}
                  </p>
                  {!testResult.ok && (
                    <div className="mt-2 p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg text-slate-600 dark:text-slate-400 text-[11px] space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Why did this happen?</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>The remote backend endpoint <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">backend/api/sync.php</code> is not deployed or returning 404.</li>
                        <li>The clinic application safely retains all data in local Dexie database so your work is never interrupted.</li>
                        <li>You can click <b>"Simulate Sync (Clear Count)"</b> to reset the pending badge count during local testing.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVER DEPLOYMENT GUIDE */}
          {activeTab === 'instructions' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  How Live Synchronization Works
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Al Rabeesh Dental System is built with a resilient <b>Offline-First Architecture</b>. Every action (booking appointments, updating doctor profiles, editing services, registering patients) is saved instantaneously into your high-speed local browser database (IndexedDB/Dexie).
                  When a cloud server is available, the sync engine pushes all pending changes to the MySQL database.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Deploying Backend to Production Server (cPanel / SSH):
                </h4>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto space-y-1">
                  <p className="text-slate-400"># 1. Reset and pull latest code to server</p>
                  <p>git reset --hard origin/main</p>
                  <p>git pull origin main</p>
                  <p className="text-slate-400 mt-2"># 2. Verify backend folder exists in public root</p>
                  <p>ls -la backend/api/sync.php</p>
                  <p className="text-slate-400 mt-2"># 3. Test sync endpoint returns 200 OK</p>
                  <p>curl -i https://alrabeesh.sandslab.com/backend/api/sync.php</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {pendingSyncCount > 0 ? `${pendingSyncCount} changes waiting in local queue` : 'All local changes synchronized'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* 🌟 PRETTY CUSTOM CONFIRMATION MODAL (Replaces browser alert/confirm) */}
        {confirmDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 text-center space-y-4">
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${
                confirmDialog.type === 'CLEAR' 
                  ? 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-rose-500/25' 
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/25'
              }`}>
                {confirmDialog.type === 'CLEAR' ? (
                  <Trash2 className="w-7 h-7" />
                ) : (
                  <Sparkles className="w-7 h-7" />
                )}
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-2">
                  {confirmDialog.message}
                </p>
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 text-left">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{confirmDialog.details}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteConfirmedAction}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    confirmDialog.type === 'CLEAR'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                  }`}
                >
                  {confirmDialog.type === 'CLEAR' ? <Trash2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  <span>{confirmDialog.confirmText}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
