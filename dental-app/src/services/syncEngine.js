import { db } from '../db/indexedDB';

class SyncEngine {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    
    // Target live production server at alrabeesh.sandslab.com with localhost fallback
    const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('sandslab.com');
    this.apiUrl = isProduction 
      ? `${window.location.origin}/backend/api/sync.php`
      : 'https://alrabeesh.sandslab.com/backend/api/sync.php';

    this.listeners = new Map();
    this.lastSyncTime = localStorage.getItem('last_sync_time') || null;

    this.init();
  }

  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('networkChange', { isOnline: true });
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('networkChange', { isOnline: false });
    });
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
    this.emit('outboxUpdated', await this.getPendingCount());

    if (this.isOnline && !this.isSyncing) {
      this.syncNow();
    }
  }

  async getPendingCount() {
    return await db.outbox_sync.where('status').equals('PENDING').count();
  }

  async syncNow() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.emit('syncStart');

    try {
      const pendingItems = await db.outbox_sync.where('status').equals('PENDING').toArray();

      if (pendingItems.length > 0) {
        const response = await fetch(`${this.apiUrl}?action=push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: localStorage.getItem('clinic_device_id') || 'BROWSER_CLIENT_1',
            items: pendingItems
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.results) {
            // Mark items as synced or remove from outbox
            const syncedIds = resJson.results.syncedIds || [];
            for (const item of pendingItems) {
              if (syncedIds.includes(item.id)) {
                await db.outbox_sync.delete(item.auto_id);
              }
            }
          }
        }
      }

      // Record last sync
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('last_sync_time', this.lastSyncTime);
      this.isSyncing = false;
      this.emit('syncSuccess', {
        lastSync: this.lastSyncTime,
        pendingCount: await this.getPendingCount()
      });
    } catch (err) {
      // Failed to reach backend (remains offline)
      this.isSyncing = false;
      this.emit('syncError', {
        error: err.message,
        pendingCount: await this.getPendingCount()
      });
    }
  }
}

export const syncEngine = new SyncEngine();
