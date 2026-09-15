import { db } from '../db/indexedDB';

class SyncEngine {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    
    // Default API URL
    this.defaultUrl = 'https://alrabeesh.sandslab.com/backend/api/sync.php';
    this.apiUrl = localStorage.getItem('clinic_sync_api_url') || this.defaultUrl;

    this.listeners = new Map();
    this.lastSyncTime = localStorage.getItem('last_sync_time') || null;

    // Dynamically determine appropriate API URL
    const isCloud = typeof window !== 'undefined' && window.location.hostname.includes('sandslab.com');
    this.defaultUrl = isCloud 
      ? `${window.location.origin}/backend/api/sync.php`
      : 'https://alrabeesh.sandslab.com/backend/api/sync.php';
    
    // Use stored URL only if explicitly customized, otherwise default
    const savedUrl = localStorage.getItem('clinic_sync_api_url');
    this.apiUrl = (savedUrl && !savedUrl.includes('alrabeesh.sandslab.com')) ? savedUrl : this.defaultUrl;

    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.emit('networkChange', { isOnline: true });
        this.syncNow().catch(() => {});
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.emit('networkChange', { isOnline: false });
      });
    }
  }

  getApiUrl() {
    return this.apiUrl;
  }

  setApiUrl(url) {
    this.apiUrl = url || this.defaultUrl;
    localStorage.setItem('clinic_sync_api_url', this.apiUrl);
    this.emit('configChanged', { apiUrl: this.apiUrl });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Sync error in ${event}:`, e); }
      });
    }
  }

  // Test connection to backend server endpoint
  async testConnection(targetUrl = this.apiUrl) {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${targetUrl}?action=status`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      const pingMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        let resJson = {};
        try { resJson = await response.json(); } catch (e) {}
        return {
          ok: true,
          status: response.status,
          statusText: response.statusText,
          pingMs,
          data: resJson,
          message: `Connected successfully (${pingMs}ms)`
        };
      } else {
        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          pingMs,
          message: `Server returned HTTP ${response.status} (${response.statusText || 'Endpoint Not Found'})`
        };
      }
    } catch (err) {
      const pingMs = Math.round(performance.now() - startTime);
      return {
        ok: false,
        status: 0,
        statusText: 'Network / CORS Error',
        pingMs,
        message: err.name === 'AbortError' ? 'Connection timed out (6s)' : (err.message || 'Server unreachable')
      };
    }
  }

  // Queue a change in Outbox when offline or immediately trigger if online
  async queueChange(entityType, entityId, operation, payload) {
    const queueItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      operation,
      payload,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    await db.outbox_sync.add(queueItem);
    const count = await this.getPendingCount();
    this.emit('outboxUpdated', count);

    if (this.isOnline && !this.isSyncing) {
      this.syncNow().catch(() => {});
    }
  }

  async getPendingCount() {
    try {
      return await db.outbox_sync.where('status').equals('PENDING').count();
    } catch (e) {
      return 0;
    }
  }

  async getPendingItems() {
    try {
      return await db.outbox_sync.where('status').equals('PENDING').reverse().toArray();
    } catch (e) {
      return [];
    }
  }

  // Clear or flush the outbox
  async clearOutbox() {
    try {
      await db.outbox_sync.clear();
      this.emit('outboxUpdated', 0);
      return true;
    } catch (e) {
      console.error('Failed to clear outbox:', e);
      return false;
    }
  }

  // Trigger synchronization
  async syncNow({ forceMock = false } = {}) {
    if (this.isSyncing) return { success: false, message: 'Sync already in progress' };
    this.isSyncing = true;
    this.emit('syncStart');

    try {
      const pendingItems = await db.outbox_sync.where('status').equals('PENDING').toArray();

      if (pendingItems.length === 0) {
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('last_sync_time', this.lastSyncTime);
        this.isSyncing = false;
        this.emit('syncSuccess', {
          lastSync: this.lastSyncTime,
          pendingCount: 0,
          syncedCount: 0,
          message: 'All records are up to date'
        });
        return { success: true, count: 0, message: 'Queue is empty' };
      }

      // Handle Mock / Local Simulation Sync (e.g. for offline dev or test)
      if (forceMock) {
        for (const item of pendingItems) {
          await db.outbox_sync.delete(item.auto_id);
        }
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('last_sync_time', this.lastSyncTime);
        this.isSyncing = false;
        const remaining = await this.getPendingCount();
        this.emit('syncSuccess', {
          lastSync: this.lastSyncTime,
          pendingCount: remaining,
          syncedCount: pendingItems.length,
          message: `Simulated sync completed for ${pendingItems.length} items.`
        });
        this.emit('outboxUpdated', remaining);
        return { success: true, count: pendingItems.length, message: `Simulated sync for ${pendingItems.length} records.` };
      }

      // Real HTTP Sync with Server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.apiUrl}?action=push`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          deviceId: localStorage.getItem('clinic_device_id') || 'BROWSER_CLIENT_1',
          items: pendingItems
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Endpoint Error'})`);
      }

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.message || 'Server rejected sync batch');
      }

      // Process synced IDs from response
      const syncedIds = resJson.results?.syncedIds || [];
      let deletedCount = 0;
      for (const item of pendingItems) {
        if (syncedIds.includes(item.id)) {
          await db.outbox_sync.delete(item.auto_id);
          deletedCount++;
        }
      }

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('last_sync_time', this.lastSyncTime);
      this.isSyncing = false;
      const remainingCount = await this.getPendingCount();

      this.emit('syncSuccess', {
        lastSync: this.lastSyncTime,
        pendingCount: remainingCount,
        syncedCount: deletedCount,
        message: `Successfully synchronized ${deletedCount} records with server`
      });
      this.emit('outboxUpdated', remainingCount);

      return {
        success: true,
        count: deletedCount,
        remaining: remainingCount,
        results: resJson.results
      };

    } catch (err) {
      this.isSyncing = false;
      const remainingCount = await this.getPendingCount();
      const errorMsg = err.name === 'AbortError' ? 'Sync timed out after 10s' : (err.message || 'Server unreachable');

      this.emit('syncError', {
        error: errorMsg,
        pendingCount: remainingCount
      });

      return {
        success: false,
        error: errorMsg,
        pendingCount: remainingCount
      };
    }
  }
}

export const syncEngine = new SyncEngine();
