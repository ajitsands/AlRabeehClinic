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

  // Trigger Smart Card Read via WebSocket or REST API fallback
  async readSmartCard(options = {}) {
    this.isReading = true;
    this.emit('readingStart');

    // 1. Try via WebSocket if active
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

      // Return a promise with timeout for WebSocket response
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

        // 10 second timeout fallback to REST or Simulator
        setTimeout(async () => {
          cleanup();
          try {
            const restResult = await this.readViaRest(options);
            resolve(restResult);
          } catch (restErr) {
            reject(new Error('Card reading timed out or no card detected in reader.'));
          }
        }, 8000);
      });
    }

    // 2. Fallback to RESTful service if WS not active
    try {
      const restResult = await this.readViaRest(options);
      this.isReading = false;
      this.emit('readSuccess', restResult);
      return restResult;
    } catch (err) {
      this.isReading = false;
      this.emit('readError', err);
      throw err;
    }
  }

  async readViaRest(options = {}) {
    const response = await fetch(options.restUrl || this.restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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
      throw new Error(`REST reader service returned status: ${response.status}`);
    }

    const json = await response.json();
    return this.parseCardPayload(json);
  }

  // Parses raw CIO Smartcard JSON to normalized Clinic Patient model
  parseCardPayload(raw) {
    if (!raw) return null;

    // Support both direct properties and nested CIO structures
    const cpr = raw.CPR || raw.IdNumber || raw.PersonalNumber || raw.CPRNumber || '';
    const nameEn = [raw.EnglishFirstName, raw.EnglishSecondName, raw.EnglishThirdName, raw.EnglishLastName]
      .filter(Boolean)
      .join(' ') || raw.NameEn || raw.FullNameEn || raw.EnglishName || 'Cardholder Name';

    const nameAr = [raw.ArabicFirstName, raw.ArabicSecondName, raw.ArabicThirdName, raw.ArabicLastName]
      .filter(Boolean)
      .join(' ') || raw.NameAr || raw.FullNameAr || raw.ArabicName || '';

    let formattedDob = raw.DateOfBirth || raw.BirthDate || '';
    if (formattedDob && formattedDob.length === 8 && !formattedDob.includes('-')) {
      // YYYYMMDD -> YYYY-MM-DD
      formattedDob = `${formattedDob.slice(0, 4)}-${formattedDob.slice(4, 6)}-${formattedDob.slice(6, 8)}`;
    }

    const gender = (raw.Gender && (raw.Gender.toString().toUpperCase().startsWith('F') || raw.Gender === '2')) ? 'FEMALE' : 'MALE';
    const nationality = raw.NationalityDescription || raw.Nationality || raw.NationalityCode || 'Bahraini';
    
    // Address format
    const addressParts = [
      raw.FlatNumber ? `Flat ${raw.FlatNumber}` : '',
      raw.BuildingNumber ? `Bldg ${raw.BuildingNumber}` : '',
      raw.RoadNumber ? `Road ${raw.RoadNumber}` : '',
      raw.BlockNumber ? `Block ${raw.BlockNumber}` : '',
      raw.AreaName || raw.City || ''
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : (raw.Address || 'Kingdom of Bahrain');

    // Photo Base64
    let photoBase64 = raw.Photo || raw.CardHolderPhoto || raw.BiometricPhoto || null;
    if (photoBase64 && !photoBase64.startsWith('data:image')) {
      photoBase64 = `data:image/jpeg;base64,${photoBase64}`;
    }

    return {
      cpr_number: cpr,
      full_name_en: nameEn,
      full_name_ar: nameAr,
      dob: formattedDob,
      gender: gender,
      nationality: nationality,
      blood_group: raw.BloodGroup || raw.BloodType || 'O+',
      phone: raw.TelephoneNumber || raw.MobileNumber || '',
      email: raw.EmailAddress || '',
      address: address,
      passport_number: raw.PassportNumber || '',
      card_expiry: raw.CardExpiryDate || '',
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
        photo_base64: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        source: 'CARD_READER_SIMULATOR'
      },
      {
        cpr_number: '940608553',
        full_name_en: 'Vikram Suresh Pillai',
        full_name_ar: 'فيكرام سوريش بيلاي',
        dob: '1994-06-08',
        gender: 'MALE',
        nationality: 'Indian',
        blood_group: 'O-',
        phone: '+973 3499 1122',
        email: 'vikram.pillai@techsol.bh',
        address: 'Building 182, Flat 101, Road 2803, Adliya, Manama',
        passport_number: 'Z4928104',
        card_expiry: '2027-06-08',
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
