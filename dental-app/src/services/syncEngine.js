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

  // Pull latest clinic records from backend MySQL server into Dexie IndexedDB
  async pullFromServer(targetUrl = this.apiUrl) {
    if (!this.isOnline) return { success: false, message: 'Offline' };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${targetUrl}?action=pull&since=${encodeURIComponent('1970-01-01 00:00:00')}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Pull returned HTTP status: ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson || !resJson.success || !resJson.data) {
        throw new Error('Invalid pull response structure from server');
      }

      const { branches, users, patients, appointments, doctors, services, vitals, attachments } = resJson.data;
      let pulledCount = 0;

      // 1. Ingest Branches
      if (Array.isArray(branches) && branches.length > 0) {
        for (const b of branches) {
          const item = {
            id: b.id,
            code: b.code,
            name: b.name,
            prefix: b.prefix,
            phone: b.phone || '',
            address: b.address || '',
            color: b.color || '#2563EB',
            country: b.country || 'Bahrain',
            currency_code: b.currency_code || 'BHD',
            currency_symbol: b.currency_symbol || 'BD',
            currency_decimals: Number(b.currency_decimals !== null && b.currency_decimals !== undefined ? b.currency_decimals : 3),
            timezone: b.timezone || 'Asia/Bahrain',
            date_format: b.date_format || 'DD/MM/YYYY',
            is_active: b.is_active === 1 || b.is_active === true || b.is_active === '1',
            created_at: b.created_at,
            updated_at: b.updated_at
          };
          await db.branches.put(item);
          pulledCount++;
        }
      }

      // 2. Ingest Users
      if (Array.isArray(users) && users.length > 0) {
        for (const u of users) {
          const item = {
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            branch_id: u.branch_id || null,
            role: u.role || 'RECEPTIONIST',
            phone: u.phone || '',
            email: u.email || '',
            is_active: u.is_active === 1 || u.is_active === true || u.is_active === '1',
            created_at: u.created_at,
            updated_at: u.updated_at
          };
          await db.users.put(item);
          pulledCount++;
        }
      }

      // 3. Ingest Doctors
      if (Array.isArray(doctors) && doctors.length > 0) {
        for (const d of doctors) {
          const item = {
            id: d.id,
            name: d.name,
            specialty: d.specialty || 'General Dental Surgeon',
            qualification: d.qualification || 'BDS Dental Surgeon',
            primary_branch_id: d.primary_branch_id || 'branch-mnm',
            room_number: d.room_number || 'Room 101',
            chair_number: d.chair_number || 'Chair 1',
            phone: d.phone || '',
            email: d.email || '',
            photo_url: d.photo_url || '',
            color_tag: d.color_tag || '#2563EB',
            start_time: d.start_time || '09:00',
            end_time: d.end_time || '17:30',
            slot_duration_mins: Number(d.slot_duration_mins || 30),
            is_active: d.is_active === 1 || d.is_active === true || d.is_active === '1',
            created_at: d.created_at,
            updated_at: d.updated_at
          };
          await db.doctors.put(item);
          pulledCount++;
        }
      }

      // 4. Ingest Services
      if (Array.isArray(services) && services.length > 0) {
        for (const s of services) {
          const item = {
            id: s.id,
            name: s.name,
            category: s.category || 'General',
            price: Number(s.price || 0),
            default_duration_mins: Number(s.default_duration_mins || 30),
            required_slots: Number(s.required_slots || 1),
            description: s.description || '',
            is_active: s.is_active === 1 || s.is_active === true || s.is_active === '1',
            created_at: s.created_at,
            updated_at: s.updated_at
          };
          await db.services.put(item);
          pulledCount++;
        }
      }

      // 5. Ingest Patients
      if (Array.isArray(patients) && patients.length > 0) {
        for (const p of patients) {
          const item = {
            id: p.id,
            file_number: p.file_number,
            cpr_number: p.cpr_number || '',
            cpr_expiry: p.cpr_expiry || null,
            home_branch_id: p.home_branch_id || 'branch-mnm',
            created_at_branch_id: p.created_at_branch_id || 'branch-mnm',
            full_name_en: p.full_name_en,
            full_name_ar: p.full_name_ar || '',
            phone: p.phone,
            email: p.email || '',
            dob: p.dob || null,
            gender: p.gender || 'MALE',
            nationality: p.nationality || '',
            blood_group: p.blood_group || 'O+',
            address: p.address || '',
            emergency_contact_name: p.emergency_contact_name || '',
            emergency_contact_phone: p.emergency_contact_phone || '',
            photo_base64: p.photo_base64 || null,
            allergies: p.allergies || '',
            medical_alerts: p.medical_alerts || '',
            source: p.source || 'MANUAL',
            sync_version: p.sync_version || 1,
            created_at: p.created_at,
            updated_at: p.updated_at
          };
          await db.patients.put(item);
          pulledCount++;
        }
      }

      // 6. Ingest Appointments
      if (Array.isArray(appointments) && appointments.length > 0) {
        for (const a of appointments) {
          const item = {
            id: a.id,
            branch_id: a.branch_id || 'branch-mnm',
            patient_id: a.patient_id,
            doctor_id: a.doctor_id,
            service_id: a.service_id || null,
            appointment_date: a.appointment_date,
            start_time: a.start_time,
            end_time: a.end_time,
            slot_count: Number(a.slot_count || 1),
            duration_mins: Number(a.duration_mins || 30),
            status: a.status || 'CONFIRMED',
            chief_complaint: a.chief_complaint || '',
            notes: a.notes || '',
            estimated_fee: Number(a.estimated_fee || 0),
            created_at: a.created_at,
            updated_at: a.updated_at
          };
          await db.appointments.put(item);
          pulledCount++;
        }
      }

      // 7. Ingest Vitals
      if (Array.isArray(vitals) && vitals.length > 0) {
        for (const v of vitals) {
          const item = {
            id: v.id,
            patient_id: v.patient_id,
            recorded_at: v.recorded_at || v.created_at || new Date().toISOString(),
            bp_systolic: v.bp_systolic !== null && v.bp_systolic !== undefined ? Number(v.bp_systolic) : null,
            bp_diastolic: v.bp_diastolic !== null && v.bp_diastolic !== undefined ? Number(v.bp_diastolic) : null,
            pulse_bpm: v.pulse_bpm !== null && v.pulse_bpm !== undefined ? Number(v.pulse_bpm) : null,
            temperature_c: v.temperature_c !== null && v.temperature_c !== undefined ? Number(v.temperature_c) : null,
            spo2_percent: v.spo2_percent !== null && v.spo2_percent !== undefined ? Number(v.spo2_percent) : null,
            blood_sugar_mg: v.blood_sugar_mg !== null && v.blood_sugar_mg !== undefined ? Number(v.blood_sugar_mg) : null,
            weight_kg: v.weight_kg !== null && v.weight_kg !== undefined ? Number(v.weight_kg) : null,
            pain_scale: Number(v.pain_scale || 0),
            clinical_notes: v.clinical_notes || '',
            created_at: v.created_at || new Date().toISOString(),
            updated_at: v.updated_at || v.created_at || new Date().toISOString()
          };
          await db.vitals.put(item);
          pulledCount++;
        }
      }

      // 8. Ingest Attachments & Clinical X-Rays
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          const item = {
            id: att.id,
            patient_id: att.patient_id,
            appointment_id: att.appointment_id || null,
            file_name: att.file_name,
            original_name: att.original_name || att.file_name,
            category: att.category || 'XRAY_OPG',
            file_size_bytes: Number(att.file_size_bytes || 0),
            mime_type: att.mime_type || 'application/octet-stream',
            file_path: att.file_path || '',
            file_data_base64: att.file_data_base64 || null,
            notes: att.notes || '',
            created_at: att.created_at || new Date().toISOString(),
            updated_at: att.updated_at || att.created_at || new Date().toISOString()
          };
          await db.attachments.put(item);
          pulledCount++;
        }
      }

      // 9. Reconcile Deletions: Remove local items that were deleted on the server (preserving pending local creations)
      try {
        const pendingItems = await db.outbox_sync.where('status').equals('PENDING').toArray();
        const pendingEntityIds = new Set(pendingItems.map(p => p.entityId));

        if (Array.isArray(vitals)) {
          const serverVitalIds = new Set(vitals.map(v => v.id));
          const localVitals = await db.vitals.toArray();
          for (const lv of localVitals) {
            if (!serverVitalIds.has(lv.id) && !pendingEntityIds.has(lv.id)) {
              await db.vitals.delete(lv.id);
            }
          }
        }

        if (Array.isArray(attachments)) {
          const serverAttachIds = new Set(attachments.map(a => a.id));
          const localAtts = await db.attachments.toArray();
          for (const la of localAtts) {
            if (!serverAttachIds.has(la.id) && !pendingEntityIds.has(la.id)) {
              await db.attachments.delete(la.id);
            }
          }
        }

        if (Array.isArray(appointments)) {
          const serverApptIds = new Set(appointments.map(a => a.id));
          const localAppts = await db.appointments.toArray();
          for (const la of localAppts) {
            if (!serverApptIds.has(la.id) && !pendingEntityIds.has(la.id)) {
              await db.appointments.delete(la.id);
            }
          }
        }

        if (Array.isArray(patients)) {
          const serverPatIds = new Set(patients.map(p => p.id));
          const localPatients = await db.patients.toArray();
          for (const lp of localPatients) {
            if (!serverPatIds.has(lp.id) && !pendingEntityIds.has(lp.id)) {
              await db.patients.delete(lp.id);
            }
          }
        }

        if (Array.isArray(doctors)) {
          const serverDocIds = new Set(doctors.map(d => d.id));
          const localDocs = await db.doctors.toArray();
          for (const ld of localDocs) {
            if (!serverDocIds.has(ld.id) && !pendingEntityIds.has(ld.id)) {
              await db.doctors.delete(ld.id);
            }
          }
        }
      } catch (delReconcileErr) {
        console.warn('Deletion reconciliation notice:', delReconcileErr);
      }

      localStorage.setItem('last_server_pull_time', resJson.serverTime || new Date().toISOString());
      this.emit('pullSuccess', { pulledCount, serverTime: resJson.serverTime });
      return { success: true, count: pulledCount };

    } catch (err) {
      console.warn('Server pull error:', err);
      return { success: false, error: err.message };
    }
  }

  // Trigger synchronization: Pushes local changes & Pulls latest server records
  async syncNow({ forceMock = false } = {}) {
    if (this.isSyncing) return { success: false, message: 'Sync already in progress' };
    this.isSyncing = true;
    this.emit('syncStart');

    try {
      const pendingItems = await db.outbox_sync.where('status').equals('PENDING').toArray();

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

      let totalSynced = 0;
      const errors = [];
      const deviceId = localStorage.getItem('clinic_device_id') || 'BROWSER_CLIENT_1';

      if (pendingItems.length > 0) {
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
      }

      // Step 2: Always Pull Latest Records from Server to keep this client up to date
      const pullResult = await this.pullFromServer();

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('last_sync_time', this.lastSyncTime);
      this.isSyncing = false;
      const remainingCount = await this.getPendingCount();
      this.emit('outboxUpdated', remainingCount);

      this.emit('syncSuccess', {
        lastSync: this.lastSyncTime,
        pendingCount: remainingCount,
        syncedCount: totalSynced,
        pulledCount: pullResult.count || 0,
        message: `Sync complete: Uploaded ${totalSynced} changes, Downloaded ${pullResult.count || 0} records from server.`
      });

      return {
        success: true,
        count: totalSynced,
        pulled: pullResult.count || 0,
        remaining: remainingCount,
        errors: errors.length > 0 ? errors : undefined
      };

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
