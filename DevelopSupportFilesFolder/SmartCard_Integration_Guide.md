# Bahrain & GCC Smart Card Reader Hardware Integration Guide

**Location:** `e:\Al Rabeesh Software\DevelopSupportFilesFolder\SmartCard_Integration_Guide.md`

---

## 1. Hardware & Daemon Overview

In Bahrain and the GCC, the National Smart Card (CPR) contains chip data encrypted and managed by the Central Informatics Organisation (CIO) / Information & eGovernment Authority (iGA).

Because web browsers run in a secure sandbox and cannot directly invoke native Win32 DLLs (`BH.CIO.Smartcard.IDCardManager.dll`), the integration relies on a local background daemon:
- **Daemon Executable**: `SCardReadWebApi.exe` / `SCardReadServer.exe`
- **Windows Service**: `CIO GCC CardRead Server`
- **Default Ports**:
  - WebSocket: `ws://localhost:5060/SCardRead`
  - Secure WebSocket: `wss://localhost:5061/SCardRead`
  - RESTful API: `http://localhost:5050/api/operation/ReadCard`

---

## 2. Installation Steps

1. **Install Hardware Drivers & Middleware**:
   Run the installer in `ReaderSDK`:
   ```
   e:\Al Rabeesh Software\ReaderSDK\eRevealerSetup\eRevealerSetup 5.4.0.4.exe
   ```
2. **Verify Daemon Service**:
   Check that `CIO GCC CardRead Server` is running in `services.msc` or run `SCardReadServer.exe`.
3. **Verify WebSocket Port**:
   Verify port 5060 is listening:
   ```powershell
   Get-NetTCPConnection -LocalPort 5060
   ```

---

## 3. Communication Protocol

### WebSocket Connection:
```javascript
const socket = new WebSocket('ws://localhost:5060/SCardRead');

socket.onopen = () => {
  const requestPayload = {
    Command: 'ReadCard',
    ReadPhoto: true,
    ReadSignature: false,
    TimeoutSeconds: 15
  };
  socket.send(JSON.stringify(requestPayload));
};

socket.onmessage = (event) => {
  const cardData = JSON.parse(event.data);
  console.log('CPR:', cardData.CPRNumber);
  console.log('English Name:', cardData.CardHolderNameEn);
  console.log('Arabic Name:', cardData.CardHolderNameAr);
  console.log('Photo Base64:', cardData.CardHolderPhoto);
};
```

---

## 4. Field Mapping Reference

| Smart Card Field | Application Database Field | Notes |
|---|---|---|
| `CPRNumber` | `patients.cpr_number` | 9-digit civil number |
| `CardHolderNameEn` | `patients.full_name_en` | Full English name |
| `CardHolderNameAr` | `patients.full_name_ar` | Full Arabic name |
| `DateOfBirth` | `patients.dob` | Format `YYYY-MM-DD` |
| `Sex` / `Gender` | `patients.gender` | `MALE` / `FEMALE` |
| `Nationality` | `patients.nationality` | e.g. `Bahraini`, `Saudi`, `Indian` |
| `Address` | `patients.address` | Flat, Building, Road, Block |
| `CardHolderPhoto` | `patients.photo_base64` | Base64 encoded JPEG image |
| `Source` | `patients.source` | Set to `CARD_READER` |
