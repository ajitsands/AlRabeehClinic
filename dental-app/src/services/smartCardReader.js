/**
 * Smart Card Reader Integration Service
 * Bridges React with the local .NET CIO GCC Smart Card Reader Server
 * Running on: ws://localhost:5060/SCardRead or http://localhost:5050/api/operation/ReadCard
 */

class SmartCardReaderService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isReading = false;
    this.listeners = new Map();
    this.wsUrl = 'ws://localhost:5060/SCardRead';
    this.restUrl = 'http://localhost:5050/api/operation/ReadCard';
    this.readers = [];
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, list);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in event listener for ${event}:`, e); }
      });
    }
  }

  // Connect to the local WebSocket service
  connect(url) {
    if (url) this.wsUrl = url;

    return new Promise((resolve) => {
      try {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
          resolve(true);
          return;
        }

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.emit('connectionChange', { status: 'CONNECTED', url: this.wsUrl });
          this.getReadersList();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };

        this.ws.onerror = (err) => {
          this.isConnected = false;
          this.emit('connectionChange', { status: 'ERROR', error: err });
          resolve(false);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('connectionChange', { status: 'DISCONNECTED' });
        };
      } catch (err) {
        this.isConnected = false;
        this.emit('connectionChange', { status: 'FAILED', error: err.message });
        resolve(false);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getReadersList() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('GetReaderNames');
    }
  }

  handleIncomingMessage(data) {
    try {
      if (typeof data === 'string' && data.includes('ReaderNames')) {
        const parsed = JSON.parse(data);
        this.readers = parsed.ReaderNames || [];
        this.emit('readersUpdated', this.readers);
        return;
      }

      // Try parsing card reading payload
      const json = JSON.parse(data);
      const parsedPatient = this.parseCardPayload(json);
      this.isReading = false;
      this.emit('readSuccess', parsedPatient);
    } catch (e) {
      // Raw string format or logging
      console.log('SmartCard Reader raw message:', data);
    }
  }

  // Comprehensive connection testing across REST (Port 5050) and WebSocket (Port 5060)
  async testConnection(options = {}) {
    const wsUrl = options.wsUrl || this.wsUrl;
    const restUrl = options.restUrl || this.restUrl;
    const results = {
      rest: { ok: false, message: '', port: 5050 },
      ws: { ok: false, message: '', port: 5060 },
      overall: false,
      hasCard: false,
      message: '',
      error: null
    };

    // 1. Test REST Service (Port 5050) - Primary & Most Reliable HTTP API in Bahrain CIO SDK
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(restUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          ReadCardInfo: true,
          ReadPersonalInfo: true,
          ReadAddressDetails: true,
          ReadBiometrics: false,
          ReadEmploymentInfo: false,
          ReadImmigrationDetails: false,
          ReadTrafficDetails: false,
          SilentReading: false,
          ReaderIndex: -1,
          ReaderName: "",
          OutputFormat: "JSON",
          ValidateCard: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        results.rest.ok = true;
        const misc = data.MiscellaneousTextData || {};
        const cpr = data.IdNumber || data.CPR || misc.CPRNO;
        const name = data.EnglishFullName || misc.FirstNameEnglish;

        if (cpr || name) {
          results.hasCard = true;
          results.rest.message = `CPR Card detected & readable: ${name || cpr} (CPR: ${cpr || 'Active'})`;
        } else if (data.ErrorDescription && (data.ErrorDescription.includes('removed') || data.ErrorDescription.includes('smart card'))) {
          results.rest.message = 'Service active & USB reader detected (Ready for card insertion)';
        } else {
          results.rest.message = data.ErrorDescription || 'REST service operational on port 5050';
        }
      } else {
        results.rest.message = `HTTP ${res.status}`;
      }
    } catch (e) {
      results.rest.ok = false;
      results.rest.message = e.name === 'AbortError' ? 'REST endpoint timed out' : (e.message || 'REST offline');
    }

    // 2. Test WebSocket Service (Port 5060)
    try {
      const wsConnected = await this.connect(wsUrl);
      results.ws.ok = wsConnected;
      results.ws.message = wsConnected ? 'WebSocket active on port 5060' : 'WebSocket port 5060 not answering';
    } catch (e) {
      results.ws.ok = false;
      results.ws.message = e.message || 'WebSocket offline';
    }

    results.overall = results.rest.ok || results.ws.ok;
    
    if (results.overall) {
      this.isConnected = true;
      this.emit('connectionChange', { status: 'CONNECTED', url: results.rest.ok ? restUrl : wsUrl });
      results.message = results.hasCard 
        ? `Smart Card Reader Connected! Card found: ${results.rest.message}`
        : `Smart Card Service is ACTIVE & Running! (Port 5050 REST: Ready. Insert card to scan)`;
    } else {
      this.isConnected = false;
      this.emit('connectionChange', { status: 'DISCONNECTED' });
      results.message = 'Could not connect to SCardReadServer on localhost. If accessing via HTTPS, please allow Insecure Content in browser site settings.';
    }

    return results;
  }

  // Trigger Smart Card Read via REST API (primary) or WebSocket fallback
  async readSmartCard(options = {}) {
    this.isReading = true;
    this.emit('readingStart');

    // 1. First attempt direct REST API (Port 5050) as it is the most reliable
    try {
      const restResult = await this.readViaRest(options);
      this.isReading = false;
      this.emit('readSuccess', restResult);
      return restResult;
    } catch (restErr) {
      console.log('REST read attempt notice:', restErr.message);

      // If REST threw because no card was in the slot, propagate that specific error
      if (restErr.message.includes('card has been removed') || restErr.message.includes('no card')) {
        this.isReading = false;
        this.emit('readError', restErr);
        throw new Error('Smart Card Reader is active, but no card was detected. Please insert the patient\'s CPR chip card firmly into the reader.');
      }
    }

    // 2. Try via WebSocket if active
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = "ReadCard" + JSON.stringify({
        ReadCardInfo: true,
        ReadPersonalInfo: true,
        ReadAddressDetails: true,
        ReadBiometrics: true,
        ReadEmploymentInfo: true,
        ReadImmigrationDetails: false,
        ReadTrafficDetails: false,
        SilentReading: false,
        ReaderIndex: -1,
        ReaderName: options.readerName || "",
        OutputFormat: "JSON",
        ValidateCard: false
      });

      this.ws.send(payload);

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          this.off('readSuccess', onReadSuccess);
          this.off('readError', onReadError);
          this.isReading = false;
        };

        const onReadSuccess = (patientData) => {
          cleanup();
          resolve(patientData);
        };

        const onReadError = (err) => {
          cleanup();
          reject(err);
        };

        this.on('readSuccess', onReadSuccess);
        this.on('readError', onReadError);

        setTimeout(() => {
          cleanup();
          reject(new Error('Card reading timed out. Please ensure CPR card is properly inserted in the reader.'));
        }, 8000);
      });
    }

    this.isReading = false;
    const err = new Error('Smart Card Reader service not reachable or no card inserted.');
    this.emit('readError', err);
    throw err;
  }

  async readViaRest(options = {}) {
    const targetUrl = options.restUrl || this.restUrl;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        ReadCardInfo: true,
        ReadPersonalInfo: true,
        ReadAddressDetails: true,
        ReadBiometrics: true,
        ReadEmploymentInfo: true,
        ReadImmigrationDetails: false,
        ReadTrafficDetails: false,
        SilentReading: false,
        ReaderIndex: -1,
        ReaderName: options.readerName || "",
        OutputFormat: "JSON",
        ValidateCard: false
      })
    });

    if (!response.ok) {
      throw new Error(`REST reader service returned HTTP status: ${response.status}`);
    }

    const json = await response.json();

    const misc = json.MiscellaneousTextData || {};
    const hasData = json.CPR || json.IdNumber || json.EnglishFirstName || json.EnglishFullName || misc.CPRNO || misc.FirstNameEnglish;

    // If server returned an error description or no data was extracted
    if (json.ErrorDescription && !hasData) {
      throw new Error(json.ErrorDescription);
    }

    if (!hasData) {
      const errMsg = json.ErrorDescription || json.ErrorMessage || 'Card reading error: No data returned from card. Please check card chip and orientation in reader.';
      throw new Error(errMsg);
    }

    return this.parseCardPayload(json);
  }

  // Parses raw CIO Smartcard JSON to normalized Clinic Patient model
  parseCardPayload(raw) {
    if (!raw) return null;

    const misc = raw.MiscellaneousTextData || {};

    // CPR Number
    const cpr = raw.CPR || raw.IdNumber || misc.CPRNO || raw.PersonalNumber || raw.CPRNumber || '';

    // English Full Name
    let nameEn = raw.EnglishFullName;
    if (!nameEn || nameEn.trim() === '') {
      const parts = [
        raw.EnglishFirstName || misc.FirstNameEnglish,
        raw.EnglishSecondName || misc.MiddleName1English,
        raw.EnglishThirdName || misc.MiddleName2English,
        raw.EnglishLastName || misc.LastNameEnglish
      ].filter(Boolean);
      nameEn = parts.length > 0 ? parts.join(' ') : (raw.NameEn || 'Cardholder Name');
    }

    // Arabic Full Name
    let nameAr = raw.ArabicFullName;
    if (!nameAr || nameAr.trim() === '') {
      const parts = [
        raw.ArabicFirstName || misc.FirstNameArabic,
        raw.ArabicSecondName || misc.MiddleName1Arabic,
        raw.ArabicThirdName || misc.MiddleName2Arabic,
        raw.ArabicLastName || misc.LastNameArabic
      ].filter(Boolean);
      nameAr = parts.length > 0 ? parts.join(' ') : (raw.NameAr || '');
    }

    // Date of Birth format normalization
    let rawDob = raw.BirthDate || misc.DateOfBirth || raw.DateOfBirth || '';
    let formattedDob = '';
    if (rawDob) {
      if (rawDob.includes('/')) {
        // "16/06/1987" -> "1987-06-16"
        const parts = rawDob.split('/');
        if (parts.length === 3) {
          formattedDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (rawDob.length === 8 && !rawDob.includes('-')) {
        // "19870616" -> "1987-06-16"
        formattedDob = `${rawDob.slice(0, 4)}-${rawDob.slice(4, 6)}-${rawDob.slice(6, 8)}`;
      } else {
        formattedDob = rawDob;
      }
    }

    // Gender
    const rawGender = raw.Gender || misc.Gender || '';
    const gender = (rawGender.toString().toUpperCase().startsWith('F') || rawGender === '2') ? 'FEMALE' : 'MALE';

    // Nationality
    const nationality = raw.NationalityDescription || (raw.CardCountry === 'BAH' ? 'Bahraini' : (raw.Nationality || 'Bahraini'));

    // Address
    const address = raw.AddressEnglish || raw.AddressArabic || [
      misc.FlatNo ? `Flat ${misc.FlatNo}` : '',
      misc.BuildingNo ? `Bldg ${misc.BuildingNo}` : '',
      misc.RoadNo ? `Road ${misc.RoadNo}` : '',
      misc.BlockNo ? `Block ${misc.BlockNo}` : '',
      misc.BlockName || '',
      misc.GovernorateNameEnglish || ''
    ].filter(Boolean).join(', ') || raw.Address || 'Kingdom of Bahrain';

    // Phone / Mobile
    const phone = misc.ContactNo || misc.MobileNumber || raw.TelephoneNumber || raw.MobileNumber || '';
    const email = misc.Email || raw.EmailAddress || '';

    // Card Expiry Date format normalization
    let rawExpiry = raw.CardexpiryDate || raw.CardExpiryDate || misc.CardExpiryDate || misc.ExpiryDate || raw.ExpiryDate || raw.CardExpiry || '';
    let formattedExpiry = '';
    if (rawExpiry) {
      if (rawExpiry.includes('/')) {
        const parts = rawExpiry.split('/');
        if (parts.length === 3) {
          formattedExpiry = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (rawExpiry.length === 8 && !rawExpiry.includes('-')) {
        formattedExpiry = `${rawExpiry.slice(0, 4)}-${rawExpiry.slice(4, 6)}-${rawExpiry.slice(6, 8)}`;
      } else {
        formattedExpiry = rawExpiry;
      }
    }

    // Photo Base64
    let photoBase64 = raw.PhotoB64Encoded || raw.Photo || raw.CardHolderPhoto || null;
    if (photoBase64 && !photoBase64.startsWith('data:image')) {
      photoBase64 = `data:image/jpeg;base64,${photoBase64}`;
    }

    return {
      cpr_number: cpr,
      full_name_en: nameEn.trim(),
      full_name_ar: nameAr.trim(),
      dob: formattedDob,
      gender: gender,
      nationality: nationality,
      blood_group: misc.BloodGroup || raw.BloodGroup || raw.BloodType || 'O+',
      phone: phone,
      email: email,
      address: address,
      passport_number: raw.PassportNumber || misc.PassportNo || '',
      card_expiry: formattedExpiry,
      cpr_expiry: formattedExpiry,
      photo_base64: photoBase64,
      source: 'CARD_READER',
      read_timestamp: new Date().toISOString()
    };
  }

  // Realistic Smart Card Simulator with predefined sample Bahrain & GCC Cards
  simulateCardRead(presetIndex = 0) {
    const mockCards = [
      {
        cpr_number: '910814992',
        full_name_en: 'Abdulla Ebrahim Al-Doseri',
        full_name_ar: 'عبدالله إبراهيم الدوسري',
        dob: '1991-08-14',
        gender: 'MALE',
        nationality: 'Bahraini',
        blood_group: 'A+',
        phone: '+973 3944 5566',
        email: 'a.doseri@gmail.com',
        address: 'Villa 52, Road 1402, Block 214, Muharraq',
        passport_number: 'BH8492019',
        card_expiry: '2029-08-14',
        cpr_expiry: '2029-08-14',
        photo_base64: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
        source: 'CARD_READER_SIMULATOR'
      },
      {
        cpr_number: '870422119',
        full_name_en: 'Maryam Jasim Al-Ghatam',
        full_name_ar: 'مريم جاسم الغتم',
        dob: '1987-04-22',
        gender: 'FEMALE',
        nationality: 'Bahraini',
        blood_group: 'B+',
        phone: '+973 3611 7788',
        email: 'maryam.ghatam@outlook.com',
        address: 'Apartment 4B, Tower 2, Seef District, Manama',
        passport_number: 'BH9182341',
        card_expiry: '2028-04-22',
        cpr_expiry: '2028-04-22',
        photo_base64: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        source: 'CARD_READER_SIMULATOR'
      },
      {
        cpr_number: '940608553',
        full_name_en: 'Vikram Suresh Pillai (Expired CPR Card)',
        full_name_ar: 'فيكرام سوريش بيلاي',
        dob: '1994-06-08',
        gender: 'MALE',
        nationality: 'Indian',
        blood_group: 'O-',
        phone: '+973 3499 1122',
        email: 'vikram.pillai@techsol.bh',
        address: 'Building 182, Flat 101, Road 2803, Adliya, Manama',
        passport_number: 'Z4928104',
        card_expiry: '2023-05-15',
        cpr_expiry: '2023-05-15',
        photo_base64: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        source: 'CARD_READER_SIMULATOR'
      },
      {
        cpr_number: '891230441',
        full_name_en: 'Sultan Fahad Al-Otaibi',
        full_name_ar: 'سلطان فهد العتيبي',
        dob: '1989-12-30',
        gender: 'MALE',
        nationality: 'Saudi',
        blood_group: 'AB+',
        phone: '+966 55 123 4567',
        email: 'sultan.otaibi@aramco.com',
        address: 'Khobar Plaza, Al Khobar, Saudi Arabia',
        passport_number: 'SA7728190',
        card_expiry: '2030-12-30',
        cpr_expiry: '2030-12-30',
        photo_base64: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
        source: 'CARD_READER_SIMULATOR'
      }
    ];

    const card = mockCards[presetIndex % mockCards.length];
    return new Promise((resolve) => {
      this.isReading = true;
      this.emit('readingStart');

      setTimeout(() => {
        this.isReading = false;
        this.emit('readSuccess', card);
        resolve(card);
      }, 1200);
    });
  }
}

export const smartCardService = new SmartCardReaderService();
