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

  // Trigger synchronization with intelligent size chunking and HTTP 413 fallback
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

      // Group items into size-safe batches to prevent HTTP 413 (Request Entity Too Large)
      const batches = [];
      let currentBatch = [];
      let currentBatchSizeBytes = 0;
      const MAX_BATCH_BYTES = 300 * 1024; // 300 KB safe chunk threshold
      const MAX_BATCH_ITEMS = 10;

      for (const item of pendingItems) {
        const itemSize = JSON.stringify(item).length;
        // Large items (attachments or items > 300KB) get their own dedicated single-item batch
        if (item.entityType === 'attachments' || itemSize > MAX_BATCH_BYTES) {
          if (currentBatch.length > 0) {
            batches.push(currentBatch);
            currentBatch = [];
            currentBatchSizeBytes = 0;
          }
          batches.push([item]);
        } else {
          if (currentBatch.length >= MAX_BATCH_ITEMS || (currentBatchSizeBytes + itemSize > MAX_BATCH_BYTES && currentBatch.length > 0)) {
            batches.push(currentBatch);
            currentBatch = [item];
            currentBatchSizeBytes = itemSize;
          } else {
            currentBatch.push(item);
            currentBatchSizeBytes += itemSize;
          }
        }
      }
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      let totalSynced = 0;
      const errors = [];
      const deviceId = localStorage.getItem('clinic_device_id') || 'BROWSER_CLIENT_1';

      for (const batch of batches) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for large attachments

          const response = await fetch(`${this.apiUrl}?action=push`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              deviceId,
              items: batch
            })
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 413) {
              // If batch got 413 and had multiple items, attempt item-by-item fallback
              if (batch.length > 1) {
                for (const singleItem of batch) {
                  try {
                    const singleRes = await fetch(`${this.apiUrl}?action=push`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                      body: JSON.stringify({ deviceId, items: [singleItem] })
                    });
                    if (singleRes.ok) {
                      const singleJson = await singleRes.json();
                      if (singleJson.success && singleJson.results?.syncedIds?.includes(singleItem.id)) {
                        await db.outbox_sync.delete(singleItem.auto_id);
                        totalSynced++;
                      }
                    } else {
                      errors.push(`Item ${singleItem.entityType} (${singleItem.id}): HTTP ${singleRes.status}`);
                    }
                  } catch (itemErr) {
                    errors.push(`Item ${singleItem.entityType}: ${itemErr.message}`);
                  }
                }
                continue;
              } else {
                errors.push(`Attachment "${batch[0]?.payload?.file_name || batch[0]?.id}" exceeds server upload limits (HTTP 413)`);
                continue;
              }
            }
            throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Endpoint Error'})`);
          }

          let resJson = null;
          const rawText = await response.text();
          try {
            resJson = JSON.parse(rawText);
          } catch (jsonErr) {
            console.warn('Non-JSON response received:', rawText.substring(0, 300));
            const match = rawText.match(/<b>(?:Fatal error|Warning|Notice)<\/b>:(.*?)(?:<br|\n|$)/i);
            const cleanErr = match ? match[1].replace(/<[^>]*>?/gm, '').trim() : `Server returned non-JSON format (HTTP ${response.status})`;
            errors.push(cleanErr);
            continue;
          }

          if (resJson && resJson.success) {
            const syncedIds = resJson.results?.syncedIds || [];
            for (const item of batch) {
              if (syncedIds.includes(item.id)) {
                await db.outbox_sync.delete(item.auto_id);
                totalSynced++;
              }
            }
            if (resJson.results?.errors?.length > 0) {
              errors.push(...resJson.results.errors.map(e => e.message || 'Record sync error'));
            }
          } else if (resJson) {
            errors.push(resJson.message || 'Server rejected sync batch');
          }
        } catch (batchErr) {
          console.warn('Sync batch error:', batchErr);
          errors.push(batchErr.message || 'Batch sync failed');
        }
      }

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('last_sync_time', this.lastSyncTime);
      this.isSyncing = false;
      const remainingCount = await this.getPendingCount();
      this.emit('outboxUpdated', remainingCount);

      if (totalSynced > 0) {
        this.emit('syncSuccess', {
          lastSync: this.lastSyncTime,
          pendingCount: remainingCount,
          syncedCount: totalSynced,
          message: remainingCount === 0 
            ? `Successfully synchronized all ${totalSynced} records with server`
            : `Synchronized ${totalSynced} records (${remainingCount} remaining)`
        });

        return {
          success: remainingCount === 0,
          count: totalSynced,
          remaining: remainingCount,
          errors: errors.length > 0 ? errors : undefined
        };
      } else {
        const firstError = errors[0] || 'Sync could not be completed';
        this.emit('syncError', {
          error: firstError,
          pendingCount: remainingCount
        });

        return {
          success: false,
          error: firstError,
          pendingCount: remainingCount
        };
      }

    } catch (err) {
      this.isSyncing = false;
      const remainingCount = await this.getPendingCount();
      const errorMsg = err.name === 'AbortError' ? 'Sync timed out' : (err.message || 'Server unreachable');

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
