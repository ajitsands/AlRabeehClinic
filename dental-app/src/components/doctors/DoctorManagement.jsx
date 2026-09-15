import React, { useState, useEffect } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { syncEngine } from '../../services/syncEngine';
import { 
  Stethoscope, 
  Plus, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  X, 
  Upload, 
  Edit3, 
  User, 
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
  Camera,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Check
} from 'lucide-react';

export default function DoctorManagement() {
  const { showToast } = useApp();
  const [doctors, setDoctors] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Photo Input Mode: 'UPLOAD' | 'URL'
  const [photoInputMode, setPhotoInputMode] = useState('UPLOAD');

  // Form State
  const [formName, setFormName] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formChair, setFormChair] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formColor, setFormColor] = useState('#2563EB');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formPhoto, setFormPhoto] = useState('');

  const loadDoctors = async () => {
    const list = await db.doctors.toArray();
    setDoctors(list);
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleOpenModal = (doc = null) => {
    if (doc) {
      setEditingDoctor(doc);
      setFormName(doc.name);
      setFormSpecialty(doc.specialty);
      setFormQualification(doc.qualification);
      setFormRoom(doc.room_number);
      setFormChair(doc.chair_number);
      setFormPhone(doc.phone || '');
      setFormEmail(doc.email || '');
      setFormColor(doc.color_tag || '#2563EB');
      setFormStartTime(doc.start_time || '09:00');
      setFormEndTime(doc.end_time || '17:00');
      setFormPhoto(doc.photo_url || '');
      setPhotoInputMode(doc.photo_url && doc.photo_url.startsWith('data:image/') ? 'UPLOAD' : 'URL');
    } else {
      setEditingDoctor(null);
      setFormName('');
      setFormSpecialty('General Dental Surgeon');
      setFormQualification('BDS');
      setFormRoom(`Room 10${doctors.length + 1}`);
      setFormChair(`Dental Chair ${doctors.length + 1}`);
      setFormPhone('');
      setFormEmail('');
      setFormColor('#3B82F6');
      setFormStartTime('09:00');
      setFormEndTime('17:00');
      setFormPhoto('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80');
      setPhotoInputMode('UPLOAD');
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP, GIF)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please upload a smaller image file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormPhoto(uploadEvent.target.result);
      showToast('Doctor profile photo uploaded successfully!', 'success');
    };
    reader.onerror = () => {
      showToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!formName || !formChair) {
      showToast('Please fill in Doctor Name and Chair Number', 'error');
      return;
    }

    const docData = {
      id: editingDoctor ? editingDoctor.id : `doc-${Date.now()}`,
      name: formName,
      specialty: formSpecialty,
      qualification: formQualification,
      room_number: formRoom,
      chair_number: formChair,
      phone: formPhone,
      email: formEmail,
      color_tag: formColor,
      start_time: formStartTime,
      end_time: formEndTime,
      slot_duration_mins: 30,
      photo_url: formPhoto,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    if (editingDoctor) {
      await db.doctors.put(docData);
      await syncEngine.queueChange('doctors', docData.id, 'UPDATE', docData);
      showToast('Doctor details updated successfully', 'success');
    } else {
      await db.doctors.add(docData);
      await syncEngine.queueChange('doctors', docData.id, 'INSERT', docData);
      showToast('New Doctor added to clinic schedule', 'success');
    }

    setIsModalOpen(false);
    loadDoctors();
  };

  const handleToggleStatus = async (doc) => {
    const updated = { ...doc, is_active: !doc.is_active };
    await db.doctors.put(updated);
    await syncEngine.queueChange('doctors', doc.id, 'UPDATE', updated);
    showToast(`Doctor ${doc.name} status updated`, 'info');
    loadDoctors();
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
            Doctors & Dental Chairs Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure working hours, assigned rooms/chairs, and calendar timeline tags
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Doctors Grid - 4 Cards in One Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5">
        {doctors.map((doc) => (
          <div
            key={doc.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
            style={{ borderTop: `4px solid ${doc.color_tag}` }}
          >
            <div>
              {/* Photo & Basic Details */}
              <div className="flex items-start gap-3.5 mb-3">
                <img
                  src={doc.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'}
                  alt={doc.name}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80';
                  }}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-900">
                      {doc.chair_number}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(doc)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        doc.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-1">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">
                    {doc.specialty}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {doc.qualification}
                  </p>
                </div>
              </div>

              {/* Schedule and Contact */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800 my-2">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Room / Clinic</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {doc.room_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Working Hours</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    {doc.start_time} - {doc.end_time}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Phone</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {doc.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Email</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate block">
                    {doc.email || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Action */}
            <div className="pt-3 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleOpenModal(doc)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* MODAL: ADD / EDIT DOCTOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingDoctor ? 'Edit Doctor Profile' : 'Add New Clinic Doctor'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-3 mt-4 text-xs">
              
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Tariq Al-Mansoor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Specialty / Department
                  </label>
                  <input
                    type="text"
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    placeholder="e.g. Consultant Orthodontist"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formQualification}
                    onChange={(e) => setFormQualification(e.target.value)}
                    placeholder="e.g. BDS, MSc Ortho (UK)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="e.g. Room 101"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Assigned Chair *
                  </label>
                  <input
                    type="text"
                    required
                    value={formChair}
                    onChange={(e) => setFormChair(e.target.value)}
                    placeholder="e.g. Dental Chair 1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Calendar Color Tag
                  </label>
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer p-1 bg-slate-50 dark:bg-slate-800 border"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+973 3912 3456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Doctor Profile Image Upload / URL Switcher */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold uppercase text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-500" />
                    <span>Doctor Profile Image</span>
                  </label>
                  
                  {/* Mode Selector Tabs: Upload File vs Web URL */}
                  <div className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPhotoInputMode('UPLOAD')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                        photoInputMode === 'UPLOAD'
                          ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoInputMode('URL')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                        photoInputMode === 'URL'
                          ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Web URL</span>
                    </button>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="flex items-center gap-3.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <div className="relative shrink-0">
                    <img
                      src={formPhoto || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'}
                      alt="Doctor Preview"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80';
                      }}
                      className="w-16 h-16 rounded-xl object-cover border-2 shadow-xs"
                      style={{ borderColor: formColor || '#3B82F6' }}
                    />
                    {formPhoto && (
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 text-white rounded-full shadow-2xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {formName || 'Doctor Name'}
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {formPhoto && formPhoto.startsWith('data:image/') ? 'Local File' : 'Remote URL'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {formPhoto ? (formPhoto.startsWith('data:image/') ? 'Base64 image stored in local database' : formPhoto) : 'No photo uploaded'}
                    </p>
                    {formPhoto && (
                      <button
                        type="button"
                        onClick={() => setFormPhoto('')}
                        className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Option 1: File Upload Dropzone */}
                {photoInputMode === 'UPLOAD' && (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-3 bg-white dark:bg-slate-900/50 cursor-pointer transition group">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        <Upload className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span>Click to Select & Upload Doctor Image</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Supports PNG, JPG, WebP, GIF (Max 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Option 2: Direct Web URL Input */}
                {photoInputMode === 'URL' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="url"
                        value={formPhoto}
                        onChange={(e) => setFormPhoto(e.target.value)}
                        placeholder="https://images.unsplash.com/... or /assets/doctor.jpg"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Quick Avatar Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setFormPhoto('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80')}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        👨‍⚕️ Male Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPhoto('https://images.unsplash.com/photo-1594824813585-802526e033d5?w=200&auto=format&fit=crop&q=80')}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        👩‍⚕️ Female Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPhoto('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80')}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        🩺 Surgeon
                      </button>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Save Doctor
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
