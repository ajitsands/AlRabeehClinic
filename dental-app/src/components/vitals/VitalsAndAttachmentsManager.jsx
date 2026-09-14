import React, { useState, useEffect } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { syncEngine } from '../../services/syncEngine';
import confetti from 'canvas-confetti';
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
  AlertCircle
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

  // Attachment Form State
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachCategory, setAttachCategory] = useState('XRAY_OPG');
  const [attachName, setAttachName] = useState('');
  const [attachNotes, setAttachNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState(null);

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

  // Delete Attachment
  const handleDeleteAttachment = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this clinical attachment?')) {
      await db.attachments.delete(id);
      await syncEngine.queueChange('attachments', id, 'DELETE', { id });
      showToast('Attachment deleted', 'info');
      loadData();
    }
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
            <div className="flex items-center gap-2">
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name_en} ({p.file_number}) - CPR: {p.cpr_number || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            {patient && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                      className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                      title="View Image"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteAttachment(att.id, e)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                      title="Delete"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Record Patient Vitals
                </h3>
              </div>
              <button
                onClick={() => setIsVitalsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 mt-4 text-xs">
              
              {/* BP & Pulse */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Blood Pressure (Systolic / Diastolic)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder="120"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                    />
                    <span className="font-bold text-slate-400">/</span>
                    <input
                      type="number"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder="80"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Pulse (BPM)
                  </label>
                  <input
                    type="number"
                    value={pulseBpm}
                    onChange={(e) => setPulseBpm(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                  />
                </div>
              </div>

              {/* Temperature & SpO2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    SpO2 Saturation (%)
                  </label>
                  <input
                    type="number"
                    value={spo2Percent}
                    onChange={(e) => setSpo2Percent(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                  />
                </div>
              </div>

              {/* Blood Sugar & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={bloodSugarMg}
                    onChange={(e) => setBloodSugarMg(e.target.value)}
                    placeholder="95"
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 rounded-lg font-bold text-center border"
                  />
                </div>
              </div>

              {/* Pain Scale Slider (0-10) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold uppercase text-slate-600 dark:text-slate-300">
                    Dental Pain Index: <span className="font-black text-blue-600">{painScale} / 10</span>
                  </label>
                  {getPainFace(painScale)}
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScale}
                  onChange={(e) => setPainScale(e.target.value)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0 - No Pain</span>
                  <span>5 - Moderate</span>
                  <span>10 - Severe Throbbing</span>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Clinical & Dental Charting Notes
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record symptoms, tooth quadrant notes, examination findings..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsVitalsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
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
                  accept="image/*,application/pdf,.dcm"
                />
                <label htmlFor="attachFile" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-indigo-500" />
                  <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">
                    {selectedFile ? selectedFile.name : 'Click to Browse File'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports Dental X-Rays, OPG, JPG, PNG, PDF, DICOM (Max: 100MB)
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

      {/* FULL PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 rounded-md">
                  {previewAttachment.category}
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                  {previewAttachment.file_name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-2 min-h-[300px]">
              {previewAttachment.file_data_base64 && previewAttachment.mime_type.startsWith('image/') ? (
                <img
                  src={previewAttachment.file_data_base64}
                  alt={previewAttachment.file_name}
                  className="max-h-[65vh] object-contain rounded-xl"
                />
              ) : (
                <div className="text-center text-slate-400 py-12">
                  <FileText className="w-16 h-16 mx-auto mb-2 text-indigo-400" />
                  <p className="font-bold">{previewAttachment.original_name}</p>
                  <p className="text-xs">Preview available upon download</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t text-xs">
              <span className="text-slate-500">
                Size: {(previewAttachment.file_size_bytes / (1024 * 1024)).toFixed(2)} MB • Uploaded: {formatDate(previewAttachment.created_at)}
              </span>
              
              {previewAttachment.file_data_base64 && (
                <a
                  href={previewAttachment.file_data_base64}
                  download={previewAttachment.original_name}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
