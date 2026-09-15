import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { syncEngine } from '../../services/syncEngine';
import confetti from 'canvas-confetti';
import SearchablePatientSelect from '../common/SearchablePatientSelect';
import { renderAsync as renderDocx } from 'docx-preview';
import * as XLSX from 'xlsx';
import { 
  Activity, 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  Download, 
  Eye, 
  Image as ImageIcon, 
  Heart, 
  Thermometer, 
  Gauge, 
  Droplet, 
  Scale, 
  Smile, 
  Frown, 
  Meh, 
  Calendar, 
  User, 
  CheckCircle, 
  X, 
  FileCheck,
  AlertCircle,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Contrast,
  RefreshCw,
  Move,
  ExternalLink,
  Copy,
  Check,
  Table,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';

export default function VitalsAndAttachmentsManager({ activePatientId, onBackToList }) {
  const { formatDate, showToast } = useApp();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(activePatientId || '');
  const [patient, setPatient] = useState(null);
  
  const [vitalsList, setVitalsList] = useState([]);
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'attachments'

  // Vitals Form State
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [bpSystolic, setBpSystolic] = useState(120);
  const [bpDiastolic, setBpDiastolic] = useState(80);
  const [pulseBpm, setPulseBpm] = useState(72);
  const [temperatureC, setTemperatureC] = useState(36.8);
  const [spo2Percent, setSpo2Percent] = useState(99);
  const [bloodSugarMg, setBloodSugarMg] = useState(95);
  const [weightKg, setWeightKg] = useState(70.0);
  const [painScale, setPainScale] = useState(2);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Speech Recognition (Voice to Text) State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Stop Dictation Helper
  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Start Dictation Helper
  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'error');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Capture starting text so new speech appends seamlessly
      baseTextRef.current = clinicalNotes;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Microphone active: Start speaking to dictate notes...', 'info');
      };

      recognition.onresult = (event) => {
        let transcriptAccum = '';
        for (let i = 0; i < event.results.length; i++) {
          transcriptAccum += event.results[i][0].transcript;
        }

        const prefix = baseTextRef.current ? baseTextRef.current.trim() + ' ' : '';
        setClinicalNotes(prefix + transcriptAccum.trim());
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showToast('Microphone permission denied. Please allow microphone in browser.', 'error');
        } else if (event.error !== 'no-speech') {
          showToast(`Speech recognition notice: ${event.error}`, 'info');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
      showToast('Could not start speech recognition', 'error');
    }
  };

  const toggleVoiceDictation = () => {
    if (isListening) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  // Stop listening when modal closes
  useEffect(() => {
    if (!isVitalsModalOpen && isListening) {
      stopDictation();
    }
  }, [isVitalsModalOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Attachment Form State
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachCategory, setAttachCategory] = useState('XRAY_OPG');
  const [attachName, setAttachName] = useState('');
  const [attachNotes, setAttachNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Multi-Format Attachment Viewer State (Images, PDF, Word, Excel, Text)
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isInverted, setIsInverted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [csvRows, setCsvRows] = useState([]);
  const [copiedText, setCopiedText] = useState(false);

  // Word (.docx) & Excel (.xlsx/.xls) in-window preview state
  const [excelSheets, setExcelSheets] = useState([]); // [{ name, data: [][] }]
  const [activeExcelSheet, setActiveExcelSheet] = useState(0);
  const [docxError, setDocxError] = useState(null);
  const [excelError, setExcelError] = useState(null);
  const [isDocxLoading, setIsDocxLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const docxContainerRef = useRef(null);

  // Delete Attachment Confirmation Modal State
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);

  // Helper to categorize attachment file formats
  const getAttachmentType = (att) => {
    if (!att) return 'unknown';
    const mime = (att.mime_type || '').toLowerCase();
    const name = (att.original_name || att.file_name || '').toLowerCase();

    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(name)) {
      return 'image';
    }
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      mime.includes('word') || 
      mime.includes('officedocument.wordprocessingml') || 
      /\.(doc|docx|rtf|odt)$/i.test(name)
    ) {
      return 'word';
    }
    if (
      mime.includes('excel') || 
      mime.includes('spreadsheet') || 
      mime.includes('csv') || 
      /\.(xls|xlsx|csv|tsv|ods)$/i.test(name)
    ) {
      return 'excel';
    }
    if (
      mime.startsWith('text/') || 
      /\.(txt|json|xml|log|md|html)$/i.test(name)
    ) {
      return 'text';
    }
    return 'other';
  };

  // Convert Base64 to Blob URL, render DOCX, and parse Excel / Text content
  useEffect(() => {
    if (!previewAttachment || !previewAttachment.file_data_base64) {
      setBlobUrl(null);
      setTextContent('');
      setCsvRows([]);
      setExcelSheets([]);
      setActiveExcelSheet(0);
      setDocxError(null);
      setExcelError(null);
      setIsDocxLoading(false);
      setIsExcelLoading(false);
      setCopiedText(false);
      return;
    }

    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setRotationAngle(0);
    setIsInverted(false);
    setIsFullscreen(false);
    setCopiedText(false);
    setDocxError(null);
    setExcelError(null);
    setExcelSheets([]);
    setActiveExcelSheet(0);

    const type = getAttachmentType(previewAttachment);

    try {
      const dataUri = previewAttachment.file_data_base64;
      const parts = dataUri.split(',');
      const base64Data = parts[1] || parts[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mimeMatch = dataUri.match(/data:([^;]+);base64/);
      const computedMime = previewAttachment.mime_type || (mimeMatch ? mimeMatch[1] : 'application/octet-stream');

      const blob = new Blob([byteArray], { type: computedMime });
      const createdUrl = URL.createObjectURL(blob);
      setBlobUrl(createdUrl);

      // 1. Text or simple CSV inspection
      if (type === 'text') {
        const textDecoder = new TextDecoder('utf-8');
        const decodedText = textDecoder.decode(byteArray);
        setTextContent(decodedText);
      }

      // 2. Excel & CSV Multi-sheet workbook parser
      if (type === 'excel') {
        setIsExcelLoading(true);
        try {
          const workbook = XLSX.read(byteArray, { type: 'array' });
          const sheets = workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            return {
              name: sheetName,
              data: rows
            };
          });
          setExcelSheets(sheets);
          setActiveExcelSheet(0);
          setIsExcelLoading(false);
        } catch (err) {
          console.warn('Excel parse error:', err);
          setExcelError('Could not parse workbook table. Please click Open or Download.');
          setIsExcelLoading(false);
        }
      }

      // 3. Word (.docx) client-side in-window rendering
      if (type === 'word') {
        const fileName = (previewAttachment.original_name || previewAttachment.file_name || '').toLowerCase();
        const isDocx = fileName.endsWith('.docx') || computedMime.includes('wordprocessingml');
        if (isDocx) {
          setIsDocxLoading(true);
          setTimeout(async () => {
            if (docxContainerRef.current) {
              try {
                docxContainerRef.current.innerHTML = '';
                await renderDocx(byteArray.buffer, docxContainerRef.current, undefined, {
                  className: 'docx',
                  inWrapper: true,
                  ignoreWidth: false,
                  ignoreHeight: false,
                  breakPages: true
                });
                setIsDocxLoading(false);
              } catch (err) {
                console.warn('DOCX Render Error:', err);
                setDocxError('Could not render DOCX layout directly. Please click Open or Download.');
                setIsDocxLoading(false);
              }
            } else {
              setIsDocxLoading(false);
            }
          }, 120);
        } else {
          setDocxError('Legacy .doc binary format cannot be rendered directly in browser. Please click Open or Download.');
        }
      }

      return () => {
        URL.revokeObjectURL(createdUrl);
      };
    } catch (err) {
      console.warn('Could not generate preview:', err);
    }
  }, [previewAttachment]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 5));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setRotationAngle(0);
    setIsInverted(false);
  };

  const handleRotate = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
  };

  const handleWheelZoom = (e) => {
    if (!previewAttachment || getAttachmentType(previewAttachment) !== 'image') return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoomScale((prev) => {
      const next = Math.min(Math.max(prev + delta, 0.5), 5);
      return Number(next.toFixed(2));
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2.5);
    }
  };

  const handleCopyTextContent = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      showToast('Document text copied to clipboard', 'info');
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Load initial patients & data
  const loadData = async () => {
    const pts = await db.patients.toArray();
    setPatients(pts);

    const pid = selectedPatientId || (pts.length > 0 ? pts[0].id : null);
    if (pid) {
      setSelectedPatientId(pid);
      const p = await db.patients.get(pid);
      setPatient(p);

      const vits = await db.vitals.where('patient_id').equals(pid).reverse().toArray();
      setVitalsList(vits);

      const atts = await db.attachments.where('patient_id').equals(pid).reverse().toArray();
      setAttachmentsList(atts);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPatientId]);

  useEffect(() => {
    if (activePatientId) {
      setSelectedPatientId(activePatientId);
    }
  }, [activePatientId]);

  // Save Vitals
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      showToast('Please select a patient first', 'error');
      return;
    }

    const newVital = {
      id: `vit-${Date.now()}`,
      patient_id: selectedPatientId,
      recorded_at: new Date().toISOString(),
      bp_systolic: Number(bpSystolic),
      bp_diastolic: Number(bpDiastolic),
      pulse_bpm: Number(pulseBpm),
      temperature_c: Number(temperatureC),
      spo2_percent: Number(spo2Percent),
      blood_sugar_mg: bloodSugarMg ? Number(bloodSugarMg) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      pain_scale: Number(painScale),
      clinical_notes: clinicalNotes,
      created_at: new Date().toISOString()
    };

    await db.vitals.add(newVital);
    await syncEngine.queueChange('vitals', newVital.id, 'INSERT', newVital);

    showToast('Patient vitals recorded successfully', 'success');
    setIsVitalsModalOpen(false);
    setClinicalNotes('');
    loadData();
  };

  // Handle Attachment File Selection (Supports up to 100MB)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxBytes = 100 * 1024 * 1024; // 100MB
      if (file.size > maxBytes) {
        showToast('File size exceeds maximum limit of 100 MB', 'error');
        return;
      }
      setSelectedFile(file);
      if (!attachName) {
        setAttachName(file.name.replace(/\.[^/.]+$/, ''));
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFileBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Attachment
  const handleSaveAttachment = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedFile || !fileBase64) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    const newAttach = {
      id: `att-${Date.now()}`,
      patient_id: selectedPatientId,
      file_name: attachName || selectedFile.name,
      original_name: selectedFile.name,
      category: attachCategory,
      file_size_bytes: selectedFile.size,
      mime_type: selectedFile.type || 'application/octet-stream',
      file_path: `/uploads/${selectedFile.name}`,
      file_data_base64: fileBase64,
      notes: attachNotes,
      created_at: new Date().toISOString()
    };

    await db.attachments.add(newAttach);
    await syncEngine.queueChange('attachments', newAttach.id, 'INSERT', newAttach);

    confetti({ particleCount: 50, spread: 50 });
    showToast(`File "${newAttach.file_name}" attached successfully!`, 'success');
    setIsAttachmentModalOpen(false);
    setSelectedFile(null);
    setFileBase64('');
    setAttachName('');
    setAttachNotes('');
    loadData();
  };

  // Delete Attachment Handler & Custom Confirmation
  const handleDeleteClick = (att, e) => {
    if (e) e.stopPropagation();
    setAttachmentToDelete(att);
  };

  const handleConfirmDelete = async () => {
    if (!attachmentToDelete) return;
    const { id, file_name } = attachmentToDelete;
    setAttachmentToDelete(null);
    if (previewAttachment && previewAttachment.id === id) {
      setPreviewAttachment(null);
    }
    await db.attachments.delete(id);
    await syncEngine.queueChange('attachments', id, 'DELETE', { id });
    showToast(`Attachment "${file_name}" deleted`, 'info');
    loadData();
  };

  const getPainFace = (score) => {
    if (score <= 3) return <Smile className="w-5 h-5 text-emerald-500" />;
    if (score <= 6) return <Meh className="w-5 h-5 text-amber-500" />;
    return <Frown className="w-5 h-5 text-rose-500 animate-bounce" />;
  };

  return (
    <div className="space-y-4">
      
      {/* Patient Header & Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Patient Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-blue-100 dark:bg-blue-900/40 border border-slate-200 dark:border-slate-700 shrink-0">
            {patient?.photo_base64 ? (
              <img src={patient.photo_base64} alt="Patient" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 m-3 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <SearchablePatientSelect
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
            />
            {patient && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {patient.full_name_ar ? `${patient.full_name_ar} • ` : ''}Phone: {patient.phone} • Blood: {patient.blood_group || 'O+'}
              </p>
            )}
          </div>
        </div>

        {/* Tab Toggle: Vitals vs Attachments */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('vitals')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'vitals'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Vitals ({vitalsList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'attachments'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>X-Rays & Files ({attachmentsList.length})</span>
            </button>
          </div>

          {activeTab === 'vitals' ? (
            <button
              onClick={() => setIsVitalsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log Vitals</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAttachmentModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Attachment</span>
            </button>
          )}
        </div>

      </div>

      {/* TAB CONTENT: VITALS */}
      {activeTab === 'vitals' && (
        <div className="space-y-4">
          
          {/* Latest Vitals Summary Cards */}
          {vitalsList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase">Blood Pressure</span>
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {vitalsList[0].bp_systolic}/{vitalsList[0].bp_diastolic}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">mmHg</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Normal Range</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase">Pulse</span>
                  <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {vitalsList[0].pulse_bpm}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">BPM</span>
                </div>
                <span className="text-[10px] text-slate-400">Resting Pulse</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase">Temperature</span>
                  <Thermometer className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {vitalsList[0].temperature_c}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">°C</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Normal (Apyrexial)</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase">Oxygen SpO2</span>
                  <Gauge className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {vitalsList[0].spo2_percent}%
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Optimal Saturation</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase">Blood Sugar</span>
                  <Droplet className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {vitalsList[0].blood_sugar_mg || '-'}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">mg/dL</span>
                </div>
                <span className="text-[10px] text-slate-400">Random Glucose</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase">Dental Pain Scale</span>
                  {getPainFace(vitalsList[0].pain_scale)}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {vitalsList[0].pain_scale} / 10
                </div>
                <span className="text-[10px] text-slate-400">Visual Analog</span>
              </div>

            </div>
          )}

          {/* Vitals History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Vitals & Clinical Recording Timeline
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {vitalsList.length} Records Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Blood Pressure</th>
                    <th className="p-3.5">Pulse</th>
                    <th className="p-3.5">Temp (°C)</th>
                    <th className="p-3.5">SpO2</th>
                    <th className="p-3.5">Blood Sugar</th>
                    <th className="p-3.5">Weight</th>
                    <th className="p-3.5">Pain (0-10)</th>
                    <th className="p-3.5">Clinical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vitalsList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDate(v.recorded_at)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {v.bp_systolic}/{v.bp_diastolic} mmHg
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {v.pulse_bpm} bpm
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {v.temperature_c} °C
                      </td>
                      <td className="p-3.5 font-semibold text-blue-600 dark:text-blue-400">
                        {v.spo2_percent}%
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {v.blood_sugar_mg ? `${v.blood_sugar_mg} mg/dL` : '-'}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {v.weight_kg ? `${v.weight_kg} kg` : '-'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          v.pain_scale <= 3 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          v.pain_scale <= 6 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {v.pain_scale} / 10
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {v.clinical_notes || '-'}
                      </td>
                    </tr>
                  ))}

                  {vitalsList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No vitals recorded yet. Click "Log Vitals" above to record initial reading.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: ATTACHMENTS (UP TO 100MB) */}
      {activeTab === 'attachments' && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {attachmentsList.map((att) => (
              <div
                key={att.id}
                onClick={() => setPreviewAttachment(att)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail / Image Preview */}
                  <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    {att.mime_type.startsWith('image/') && att.file_data_base64 ? (
                      <img
                        src={att.file_data_base64}
                        alt={att.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <FileCheck className="w-10 h-10 text-indigo-500" />
                        <span className="text-[11px] font-bold uppercase">{att.category}</span>
                      </div>
                    )}
                    
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-slate-900/80 text-white backdrop-blur-xs">
                      {att.category}
                    </span>

                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200">
                      {(att.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {att.file_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {att.notes || 'No description provided'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 text-xs">
                  <span className="text-[10px] text-slate-400">
                    {formatDate(att.created_at)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAttachment(att);
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                      title="View Attachment"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(att, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}

            {attachmentsList.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No clinical attachments yet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload Dental OPG X-Rays, Intraoral Photos, CBCT Scans, or Lab reports (Supports up to 100MB).
                </p>
                <button
                  onClick={() => setIsAttachmentModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Upload First Attachment
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL: LOG VITALS */}
      {isVitalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto my-auto animate-fadeIn">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Record Patient Vitals & Clinical Examination
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{patient ? `${patient.first_name} ${patient.last_name}` : 'Selected Patient'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopDictation();
                  setIsVitalsModalOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 mt-4 text-xs">
              
              {/* Primary Vitals Grid (3 columns on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Blood Pressure */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-500" />
                      Blood Pressure (mmHg)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder="Systolic (120)"
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="font-bold text-slate-400 text-sm">/</span>
                    <input
                      type="number"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder="Diastolic (80)"
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Pulse */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Pulse Rate (BPM)
                  </label>
                  <input
                    type="number"
                    value={pulseBpm}
                    onChange={(e) => setPulseBpm(e.target.value)}
                    placeholder="72"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* SpO2 */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Droplet className="w-3.5 h-3.5 text-cyan-500" />
                    SpO2 Saturation (%)
                  </label>
                  <input
                    type="number"
                    value={spo2Percent}
                    onChange={(e) => setSpo2Percent(e.target.value)}
                    placeholder="99"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Temperature */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(e.target.value)}
                    placeholder="36.8"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Blood Sugar */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                    Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={bloodSugarMg}
                    onChange={(e) => setBloodSugarMg(e.target.value)}
                    placeholder="95"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Weight */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-500" />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="70.0"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-700 rounded-xl font-bold text-center border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Pain Scale Slider (0-10) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span>Dental Pain Index:</span>
                    <span className="font-black text-sm px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      {painScale} / 10
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-3 py-1 rounded-xl shadow-xs border border-slate-200/60 dark:border-slate-600">
                    {getPainFace(painScale)}
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                      {painScale === 0 ? 'No Pain' : painScale <= 3 ? 'Mild' : painScale <= 6 ? 'Moderate' : painScale <= 8 ? 'Severe' : 'Worst Possible'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScale}
                  onChange={(e) => setPainScale(e.target.value)}
                  className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1.5 px-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">0 - Comfortable</span>
                  <span className="text-amber-600 dark:text-amber-400">5 - Moderate Ache</span>
                  <span className="text-rose-600 dark:text-rose-400">10 - Severe Throbbing</span>
                </div>
              </div>

              {/* Clinical Notes with Speech Recognition (Microphone) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Clinical & Dental Charting Notes</span>
                  </label>

                  {/* Dictation / Microphone Controls */}
                  <div className="flex items-center gap-2">
                    {clinicalNotes && (
                      <button
                        type="button"
                        onClick={() => setClinicalNotes('')}
                        className="text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                      >
                        Clear Notes
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-200 dark:ring-rose-950 animate-pulse shadow-rose-500/30'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                      }`}
                      title={isListening ? 'Click to stop voice recording' : 'Click to speak: Voice will type automatically into the box'}
                    >
                      {isListening ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                          </span>
                          <Mic className="w-4 h-4 text-white animate-bounce" />
                          <span>Doctor Speaking (Click to Stop)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>Voice Dictation (Speak to Write)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Real-time Listening Animation Banner */}
                {isListening && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-end gap-0.5 h-4 px-1">
                        <span className="w-1 bg-rose-600 dark:bg-rose-400 h-3 rounded-full animate-bounce [animation-delay:0ms]"></span>
                        <span className="w-1 bg-rose-600 dark:bg-rose-400 h-4 rounded-full animate-bounce [animation-delay:150ms]"></span>
                        <span className="w-1 bg-rose-600 dark:bg-rose-400 h-2 rounded-full animate-bounce [animation-delay:300ms]"></span>
                        <span className="w-1 bg-rose-600 dark:bg-rose-400 h-4 rounded-full animate-bounce [animation-delay:450ms]"></span>
                      </div>
                      <p className="truncate font-medium">
                        <span className="font-black uppercase">Listening...</span> Speak symptoms, quadrant notes, or findings clearly. Words will type automatically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={stopDictation}
                      className="px-2 py-0.5 bg-rose-200/60 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 font-bold rounded-lg text-[11px] shrink-0"
                    >
                      Done
                    </button>
                  </div>
                )}

                <textarea
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record symptoms, tooth quadrant notes, examination findings (or click the microphone button above to speak directly)..."
                  className={`w-full p-3.5 bg-white dark:bg-slate-700/90 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y min-h-[105px] ${
                    isListening ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-200 dark:ring-rose-900/40' : 'border-slate-200 dark:border-slate-600'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    stopDictation();
                    setIsVitalsModalOpen(false);
                  }}
                  className="px-5 py-2.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Vitals
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: UPLOAD ATTACHMENT */}
      {isAttachmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Upload Clinical Attachment (Up to 100MB)
                </h3>
              </div>
              <button
                onClick={() => setIsAttachmentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttachment} className="space-y-4 mt-4 text-xs">
              
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/80 rounded-2xl p-6 text-center bg-indigo-50/30 dark:bg-indigo-950/20">
                <input
                  type="file"
                  id="attachFile"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.dcm,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
                />
                <label htmlFor="attachFile" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-indigo-500" />
                  <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">
                    {selectedFile ? selectedFile.name : 'Click to Browse File'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports Dental X-Rays, OPG, JPG, PNG, PDF, Word (.docx), Excel (.xlsx/.csv), DICOM & Text (Max: 100MB)
                  </span>
                  {selectedFile && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB Ready
                    </span>
                  )}
                </label>
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Attachment Category
                </label>
                <select
                  value={attachCategory}
                  onChange={(e) => setAttachCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  <option value="XRAY_OPG">Dental Panoramic X-Ray (OPG)</option>
                  <option value="INTRAORAL_PHOTO">Intraoral HD Camera Photo</option>
                  <option value="LAB_REPORT">Dental Lab Report / Shade Guide</option>
                  <option value="PRESCRIPTION">Doctor Prescription</option>
                  <option value="ID_DOCUMENT">National ID / Insurance Card Copy</option>
                  <option value="OTHER">Other Diagnostic Document</option>
                </select>
              </div>

              {/* Title / Name */}
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Attachment Title
                </label>
                <input
                  type="text"
                  required
                  value={attachName}
                  onChange={(e) => setAttachName(e.target.value)}
                  placeholder="e.g. Upper Jaw Pre-OPG Scan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Clinical Remarks / Description
                </label>
                <textarea
                  rows={2}
                  value={attachNotes}
                  onChange={(e) => setAttachNotes(e.target.value)}
                  placeholder="e.g. Shows periapical abscess around molar #46"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAttachmentModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile}
                  className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs"
                >
                  Upload & Attach
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL: DELETE ATTACHMENT */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-scaleUp">
            
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
              <Trash2 className="w-7 h-7 animate-bounce" />
            </div>

            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1.5">
              Delete Clinical Attachment?
            </h3>

            {/* Target File Preview Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700 text-left my-4">
              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {attachmentToDelete.file_name}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                  {attachmentToDelete.category}
                </span>
                <span>•</span>
                <span>{(attachmentToDelete.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete this clinical file from the patient's record? This action cannot be undone.
            </p>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAttachmentToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete File</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULL PREVIEW MODAL WITH INTERACTIVE MULTI-FORMAT VIEWER (IMAGES, PDF, WORD, EXCEL, TEXT) */}
      {previewAttachment && (() => {
        const fileType = getAttachmentType(previewAttachment);

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-hidden ${isFullscreen ? 'p-0' : ''}`}>
            <div className={`bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ${
              isFullscreen 
                ? 'w-screen h-screen rounded-none p-3 sm:p-4' 
                : 'rounded-3xl max-w-6xl w-full p-4 sm:p-6 max-h-[96vh]'
            }`}>
              
              {/* Header & Format-Specific Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg shrink-0 ${
                    fileType === 'image'
                      ? 'bg-blue-600 text-white'
                      : fileType === 'pdf'
                      ? 'bg-rose-600 text-white'
                      : fileType === 'excel'
                      ? 'bg-emerald-600 text-white'
                      : fileType === 'word'
                      ? 'bg-blue-700 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}>
                    {fileType === 'image' ? previewAttachment.category : fileType.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                      {previewAttachment.file_name}
                    </h3>
                    {previewAttachment.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                        {previewAttachment.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                  {/* Image Controls: Zoom, Pan, Rotate, Invert */}
                  {fileType === 'image' && (
                    <>
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition disabled:opacity-40"
                          disabled={zoomScale <= 0.5}
                          title="Zoom Out (-25%)"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="px-2 py-1 text-xs font-black text-slate-800 dark:text-white hover:text-blue-600 min-w-[50px] text-center"
                          title="Click to reset zoom to 100%"
                        >
                          {Math.round(zoomScale * 100)}%
                        </button>

                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition disabled:opacity-40"
                          disabled={zoomScale >= 5}
                          title="Zoom In (+25%)"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleRotate}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsInverted((prev) => !prev)}
                        className={`p-2 rounded-xl border transition flex items-center gap-1 text-xs font-semibold ${
                          isInverted
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                        title="Toggle X-Ray Invert / High-Contrast Mode"
                      >
                        <Contrast className="w-4 h-4" />
                        <span className="hidden sm:inline text-[11px]">X-Ray Invert</span>
                      </button>

                      {(zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0 || rotationAngle !== 0 || isInverted) && (
                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                          title="Reset Zoom, Position, and Rotation"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Text / Code Copy Button */}
                  {fileType === 'text' && textContent && (
                    <button
                      type="button"
                      onClick={handleCopyTextContent}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
                      title="Copy text content"
                    >
                      {copiedText ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden sm:inline">{copiedText ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  )}

                  {/* Open in New Window/Tab for PDF, Word, Excel, Docs */}
                  {blobUrl && (
                    <a
                      href={blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 text-xs font-semibold"
                      title="Open in new browser tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline text-[11px]">Open Tab</span>
                    </a>
                  )}

                  {/* Universal Fullscreen Toggle for ALL file types */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                    title={isFullscreen ? 'Exit Fullscreen' : 'View in Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    <span className="hidden sm:inline text-[11px] font-semibold">{isFullscreen ? 'Exit' : 'Full Screen'}</span>
                  </button>

                  {/* Close Modal Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    title="Close Viewer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* VIEWPORT CANVAS (FORMAT-AWARE) */}
              <div 
                className={`relative my-2 sm:my-3 flex-1 overflow-hidden flex flex-col items-stretch rounded-2xl select-none transition-all ${
                  fileType === 'image'
                    ? 'bg-slate-950 items-center justify-center'
                    : 'bg-slate-100 dark:bg-slate-900'
                } ${
                  isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[72vh] min-h-[500px]'
                } ${
                  fileType === 'image'
                    ? zoomScale > 1 
                      ? isDragging 
                        ? 'cursor-grabbing' 
                        : 'cursor-grab' 
                      : 'cursor-zoom-in'
                    : 'cursor-default'
                }`}
                onWheel={fileType === 'image' ? handleWheelZoom : undefined}
                onMouseDown={fileType === 'image' ? handleMouseDown : undefined}
                onMouseMove={fileType === 'image' ? handleMouseMove : undefined}
                onMouseUp={fileType === 'image' ? handleMouseUp : undefined}
                onMouseLeave={fileType === 'image' ? handleMouseUp : undefined}
                onDoubleClick={fileType === 'image' ? handleDoubleClick : undefined}
              >
                {/* 1. IMAGE & X-RAY VIEWER */}
                {fileType === 'image' && previewAttachment.file_data_base64 && (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={previewAttachment.file_data_base64}
                      alt={previewAttachment.file_name}
                      draggable={false}
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationAngle}deg)`,
                        filter: isInverted ? 'invert(1) hue-rotate(180deg) contrast(130%)' : 'none',
                        transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        userSelect: 'none'
                      }}
                      className="pointer-events-none drop-shadow-2xl"
                    />
                  </div>
                )}

                {/* 2. PDF DOCUMENT VIEWER (Embedded Full In-Window - Zero Black Bars) */}
                {fileType === 'pdf' && (
                  <div className="w-full h-full flex-1 flex flex-col p-0 m-0 bg-slate-100 dark:bg-slate-900">
                    {blobUrl ? (
                      <iframe
                        src={`${blobUrl}#view=FitH&toolbar=1`}
                        className="w-full h-full flex-1 rounded-2xl border-0 bg-white shadow-xs"
                        title={previewAttachment.file_name}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-slate-400">
                        <FileText className="w-16 h-16 text-rose-500 mb-2 animate-bounce" />
                        <p className="font-bold">Loading PDF Document...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. EXCEL & SPREADSHEET VIEWER (Interactive Multi-Sheet Table) */}
                {fileType === 'excel' && (
                  <div className="w-full h-full flex flex-col flex-1 overflow-hidden bg-slate-900 rounded-2xl">
                    {/* Sheet Tabs */}
                    {excelSheets.length > 1 && (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border-b border-slate-800 overflow-x-auto shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 flex items-center gap-1">
                          <Table className="w-3.5 h-3.5 text-emerald-400" />
                          Sheets:
                        </span>
                        {excelSheets.map((sh, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => setActiveExcelSheet(sIdx)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                              activeExcelSheet === sIdx
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {sh.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {isExcelLoading && (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-slate-400">
                        <FileSpreadsheet className="w-16 h-16 text-emerald-500 mb-2 animate-bounce" />
                        <p className="font-bold text-sm text-slate-200">Parsing Spreadsheet Table...</p>
                      </div>
                    )}

                    {!isExcelLoading && excelSheets.length > 0 && excelSheets[activeExcelSheet] && (
                      <div className="w-full h-full flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 text-slate-200">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          {excelSheets[activeExcelSheet].data.length > 0 && (
                            <>
                              <thead className="sticky top-0 bg-slate-800 text-emerald-400 font-bold uppercase border-b border-slate-700 shadow-xs z-10">
                                <tr>
                                  <th className="p-2.5 border-r border-slate-700 w-12 text-center text-slate-400 font-mono">#</th>
                                  {excelSheets[activeExcelSheet].data[0].map((header, idx) => (
                                    <th key={idx} className="p-2.5 border-r border-slate-700 whitespace-nowrap">
                                      {header !== undefined && header !== '' ? String(header) : `Col ${idx + 1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 text-slate-200">
                                {excelSheets[activeExcelSheet].data.slice(1).map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-800/60 transition-colors">
                                    <td className="p-2 border-r border-slate-800 text-center font-mono text-[11px] text-slate-500 bg-slate-900/60 sticky left-0">
                                      {rIdx + 1}
                                    </td>
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="p-2 border-r border-slate-800 whitespace-nowrap font-mono text-[11px]">
                                        {cell !== undefined ? String(cell) : ''}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </>
                          )}
                        </table>
                      </div>
                    )}

                    {!isExcelLoading && excelSheets.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 py-12">
                        <div className="p-4 bg-emerald-950/60 rounded-3xl border border-emerald-800 mb-4 text-emerald-400">
                          <FileSpreadsheet className="w-16 h-16" />
                        </div>
                        <h4 className="font-bold text-lg text-white mb-1">{previewAttachment.original_name}</h4>
                        <p className="text-xs text-slate-400 max-w-md mb-6">
                          {excelError || 'Spreadsheet ready. Click below to open or download.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          {blobUrl && (
                            <a
                              href={blobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-xs"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open in Excel / Browser Tab</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition flex items-center gap-2 text-xs"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. WORD DOCUMENT VIEWER (DOCX in-window rendered) */}
                {fileType === 'word' && (
                  <div className="w-full h-full flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden">
                    {isDocxLoading && (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-slate-400">
                        <FileText className="w-16 h-16 text-blue-500 mb-2 animate-bounce" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Rendering Word Document (.docx)...</p>
                      </div>
                    )}
                    {docxError && (
                      <div className="w-full h-full p-4 flex flex-col flex-1 items-center justify-center text-center bg-slate-900 rounded-2xl text-slate-300">
                        <div className="p-4 bg-blue-950/60 rounded-3xl border border-blue-800 mb-4 text-blue-400">
                          <FileText className="w-16 h-16" />
                        </div>
                        <h4 className="font-bold text-lg text-white mb-1">{previewAttachment.original_name}</h4>
                        <p className="text-xs text-slate-400 max-w-md mb-6">
                          {docxError}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          {blobUrl && (
                            <a
                              href={blobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-xs"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open in Word / Browser Tab</span>
                            </a>
                          )}
                          <a
                            href={previewAttachment.file_data_base64}
                            download={previewAttachment.original_name}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition flex items-center gap-2 text-xs"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Original</span>
                          </a>
                        </div>
                      </div>
                    )}
                    <div 
                      ref={docxContainerRef} 
                      className={`w-full h-full flex-1 overflow-auto p-2 sm:p-4 ${isDocxLoading || docxError ? 'hidden' : 'block'}`}
                    />
                  </div>
                )}

                {/* 5. TEXT / JSON / XML / LAB LOGS VIEWER */}
                {fileType === 'text' && (
                  <div className="w-full h-full p-3 sm:p-4 overflow-auto bg-slate-950 font-mono text-xs text-slate-300 rounded-xl">
                    <pre className="whitespace-pre-wrap leading-relaxed select-text font-mono">
                      {textContent || 'Loading document contents...'}
                    </pre>
                  </div>
                )}

                {/* 6. OTHER NON-IMAGE ATTACHMENTS */}
                {fileType === 'other' && (
                  <div className="text-center text-slate-400 py-16">
                    <FileCheck className="w-16 h-16 mx-auto mb-3 text-indigo-400" />
                    <p className="font-bold text-slate-200">{previewAttachment.original_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Clinical document ready. Download or open below to view.</p>
                  </div>
                )}

                {/* Overlay Quick Zoom Presets Bar for Images Only */}
                {fileType === 'image' && (
                  <div className="absolute bottom-3 inset-x-0 flex justify-center items-center pointer-events-none px-4">
                    <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full shadow-xl pointer-events-auto text-xs">
                      <span className="text-[11px] font-semibold text-slate-400 hidden md:inline mr-1">
                        Quick Zoom:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setZoomScale(1);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                          zoomScale === 1
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Fit (100%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(1.5)}
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                          zoomScale === 1.5
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        150%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(2)}
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                          zoomScale === 2
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        200%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(3)}
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                          zoomScale === 3
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        300%
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with metadata & download */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>
                    Size: <strong className="text-slate-700 dark:text-slate-300">{(previewAttachment.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Uploaded: <strong className="text-slate-700 dark:text-slate-300">{formatDate(previewAttachment.created_at)}</strong>
                  </span>
                  {fileType === 'image' && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-blue-600 dark:text-blue-400 font-medium">
                        💡 Scroll wheel to zoom • Drag to pan • Click presets to adjust
                      </span>
                    </>
                  )}
                  {fileType === 'pdf' && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-rose-600 dark:text-rose-400 font-semibold animate-pulse">
                        💡 Click on [Full Screen] ⛶ for Maximized Clinical Examination
                      </span>
                    </>
                  )}
                  {fileType === 'excel' && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">
                        💡 Click on [Full Screen] ⛶ for Expanded Spreadsheet Grid View
                      </span>
                    </>
                  )}
                  {fileType === 'word' && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-blue-600 dark:text-blue-400 font-semibold">
                        💡 Click on [Full Screen] ⛶ for Expanded Document View
                      </span>
                    </>
                  )}
                  {fileType === 'text' && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-indigo-600 dark:text-indigo-400 font-semibold">
                        💡 Click on [Full Screen] ⛶ for Expanded Inspector View
                      </span>
                    </>
                  )}
                </div>
                
                {previewAttachment.file_data_base64 && (
                  <a
                    href={previewAttachment.file_data_base64}
                    download={previewAttachment.original_name}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original File</span>
                  </a>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
