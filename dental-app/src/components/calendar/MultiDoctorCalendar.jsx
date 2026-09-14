import React, { useState, useEffect } from 'react';
import { db } from '../../db/indexedDB';
import { useApp, generateClinicTimeSlots, isSlotInBreak } from '../../context/AppContext';
import { syncEngine } from '../../services/syncEngine';
import confetti from 'canvas-confetti';
import SearchablePatientSelect from '../common/SearchablePatientSelect';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Phone, 
  FileText, 
  Check, 
  X, 
  CreditCard, 
  Filter, 
  UserCheck,
  Coffee,
  Ban
} from 'lucide-react';

export default function MultiDoctorCalendar({ onOpenPatientProfile, isModalOpen, setIsModalOpen, preselectedSlot, setPreselectedSlot }) {
  const { formatCurrency, formatDate, showToast, settings } = useApp();

  const timeSlots = generateClinicTimeSlots(
    settings.clinic_open_time || '09:00',
    settings.clinic_close_time || '17:30',
    settings.slot_interval_mins || 30
  );

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');

  // Appointment Details Modal
  const [activeAppointment, setActiveAppointment] = useState(null);

  // Form State for New Booking
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState(timeSlots[0] || '09:00');
  const [bookingSlotCount, setBookingSlotCount] = useState(1);
  const [bookingDurationMins, setBookingDurationMins] = useState(30);
  const [bookingChiefComplaint, setBookingChiefComplaint] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Load Data
  const loadData = async () => {
    const docs = await db.doctors.filter(d => d.is_active).toArray();
    const srvs = await db.services.filter(s => s.is_active).toArray();
    const pts = await db.patients.toArray();
    const apps = await db.appointments.where('appointment_date').equals(selectedDate).toArray();

    setDoctors(docs);
    setServices(srvs);
    setPatients(pts);
    setAppointments(apps);

    if (docs.length > 0 && !bookingDoctorId) {
      setBookingDoctorId(docs[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Handle Opening Booking Modal from a specific slot
  const handleSlotClick = (doctorId, timeSlot) => {
    // 1. Check if slot falls in Clinic Break Time
    if (isSlotInBreak(timeSlot, settings)) {
      showToast(`Clinic is on ${settings.break_label || 'Lunch Break'} (${settings.break_start_time} - ${settings.break_end_time}). No appointments or consultations can be scheduled during break.`, 'warning');
      return;
    }

    // 2. Check if slot is already occupied
    const isOccupied = appointments.some(app => {
      if (app.doctor_id !== doctorId || app.status === 'CANCELLED') return false;
      const startIndex = timeSlots.indexOf(app.start_time);
      const endIndex = startIndex + (app.slot_count || 1);
      const targetIndex = timeSlots.indexOf(timeSlot);
      return targetIndex >= startIndex && targetIndex < endIndex;
    });

    if (isOccupied) {
      showToast('This time slot is already booked for this doctor', 'warning');
      return;
    }

    setBookingDoctorId(doctorId);
    setBookingStartTime(timeSlot);
    if (services.length > 0) {
      const defaultSrv = services[0];
      setBookingServiceId(defaultSrv.id);
      setBookingSlotCount(defaultSrv.required_slots || 1);
      setBookingDurationMins(defaultSrv.default_duration_mins || 30);
    }
    setIsModalOpen(true);
  };

  // When Service Changes, Auto-Update Duration & Slot Count
  const handleServiceChange = (serviceId) => {
    setBookingServiceId(serviceId);
    const srv = services.find(s => s.id === serviceId);
    if (srv) {
      setBookingSlotCount(srv.required_slots || 1);
      setBookingDurationMins(srv.default_duration_mins || (srv.required_slots * 30));
    }
  };

  // Save New Appointment with Break Time Validation
  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    if (!bookingDoctorId || !bookingPatientId || !bookingStartTime) {
      showToast('Please select Doctor, Patient, and Start Time', 'error');
      return;
    }

    const startIndex = timeSlots.indexOf(bookingStartTime);
    const count = Number(bookingSlotCount);
    const endIndex = startIndex + count;
    const calculatedEndTime = timeSlots[endIndex] || settings.clinic_close_time || '17:30';

    // 1. Break Time Collision Check
    for (let i = startIndex; i < endIndex; i++) {
      const slotT = timeSlots[i];
      if (slotT && isSlotInBreak(slotT, settings)) {
        showToast(`Cannot book: Appointment spans into Clinic ${settings.break_label || 'Lunch Break'} (${settings.break_start_time} - ${settings.break_end_time})!`, 'error');
        return;
      }
    }

    // 2. Doctor Schedule Collision Check
    const collision = appointments.some(app => {
      if (app.doctor_id !== bookingDoctorId || app.status === 'CANCELLED') return false;
      const aStart = timeSlots.indexOf(app.start_time);
      const aEnd = aStart + (app.slot_count || 1);
      return Math.max(startIndex, aStart) < Math.min(endIndex, aEnd);
    });

    if (collision) {
      showToast('Appointment overlaps with an existing booking for this doctor!', 'error');
      return;
    }

    const srv = services.find(s => s.id === bookingServiceId);

    const newAppointment = {
      id: `app-${Date.now()}`,
      patient_id: bookingPatientId,
      doctor_id: bookingDoctorId,
      service_id: bookingServiceId || null,
      appointment_date: selectedDate,
      start_time: bookingStartTime,
      end_time: calculatedEndTime,
      slot_count: Number(bookingSlotCount),
      duration_mins: Number(bookingDurationMins),
      status: 'CONFIRMED',
      chief_complaint: bookingChiefComplaint,
      notes: bookingNotes,
      estimated_fee: srv ? srv.price : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.appointments.add(newAppointment);
    await syncEngine.queueChange('appointments', newAppointment.id, 'INSERT', newAppointment);

    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    showToast('Appointment booked successfully!', 'success');
    setIsModalOpen(false);
    loadData();

    // Reset fields
    setBookingChiefComplaint('');
    setBookingNotes('');
    setPatientSearchQuery('');
  };

  // Update Appointment Status
  const handleUpdateStatus = async (appId, newStatus) => {
    await db.appointments.update(appId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
    const updated = await db.appointments.get(appId);
    await syncEngine.queueChange('appointments', appId, 'UPDATE', updated);

    showToast(`Appointment status updated to ${newStatus}`, 'success');
    setActiveAppointment(null);
    loadData();
  };

  // Navigation helpers for dates
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Filtered Patients for Booking Search
  const filteredPatients = patients.filter(p => {
    if (!patientSearchQuery) return true;
    const q = patientSearchQuery.toLowerCase();
    return (
      (p.full_name_en && p.full_name_en.toLowerCase().includes(q)) ||
      (p.full_name_ar && p.full_name_ar.includes(q)) ||
      (p.cpr_number && p.cpr_number.includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.file_number && p.file_number.toLowerCase().includes(q))
    );
  });

  const displayedDoctors = selectedDoctorFilter === 'ALL'
    ? doctors
    : doctors.filter(d => d.id === selectedDoctorFilter);

  // Status Color Tags
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'CHECKED_IN':
        return 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'IN_CHAIR':
        return 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'CANCELLED':
        return 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 line-through';
      case 'SCHEDULED':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Calendar Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs transition"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-sm text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
            {formatDate(selectedDate)}
          </span>
        </div>

        {/* Legend & Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Checked-In</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
            <span>In Dental Chair</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Completed</span>
          </div>

          {/* Doctor Filter */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none"
            >
              <option value="ALL">All Doctors ({doctors.length})</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.chair_number})</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* SINGLE WINDOW MULTI-DOCTOR MATRIX */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            
            {/* Table Header: Doctors Side-by-Side */}
            <div className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-20"
              style={{ gridTemplateColumns: `100px repeat(${displayedDoctors.length}, minmax(200px, 1fr))` }}
            >
              {/* Corner Slot label */}
              <div className="p-3.5 flex items-center justify-center font-bold text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                <Clock className="w-4 h-4 mr-1 text-blue-500" />
                <span>Time</span>
              </div>

              {/* Doctor Columns */}
              {displayedDoctors.map((doc) => (
                <div 
                  key={doc.id} 
                  className="p-3 border-r border-slate-200 dark:border-slate-800 flex items-center gap-3"
                  style={{ borderTop: `4px solid ${doc.color_tag}` }}
                >
                  <img
                    src={doc.photo_url}
                    alt={doc.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {doc.name}
                    </h4>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                      {doc.chair_number}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {doc.specialty}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Matrix Body: Time Slot Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {timeSlots.map((timeSlot) => {
                const slotIndex = timeSlots.indexOf(timeSlot);
                const nextSlotTime = slotIndex !== -1 && slotIndex + 1 < timeSlots.length ? timeSlots[slotIndex + 1] : settings.clinic_close_time || '17:30';
                const isBreak = isSlotInBreak(timeSlot, settings);

                return (
                  <div
                    key={timeSlot}
                    className={`grid min-h-[88px] ${isBreak ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}
                    style={{ gridTemplateColumns: `100px repeat(${displayedDoctors.length}, minmax(200px, 1fr))` }}
                  >
                    {/* Time Label Column */}
                    <div className={`p-2 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center ${
                      isBreak 
                        ? 'bg-amber-100/60 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-extrabold' 
                        : 'bg-slate-50/50 dark:bg-slate-900/50'
                    }`}>
                      <div className="flex items-center gap-1">
                        {isBreak && <Coffee className="w-3 h-3 text-amber-600 shrink-0" />}
                        <span className={`text-xs ${isBreak ? 'font-black text-amber-900 dark:text-amber-200' : 'font-extrabold text-slate-800 dark:text-slate-200'}`}>
                          {timeSlot}
                        </span>
                      </div>
                      <span className={`text-[10px] font-medium mt-0.5 ${isBreak ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                        {isBreak ? 'Break' : `${settings.slot_interval_mins || 30} min`}
                      </span>
                    </div>

                    {/* Doctor Slot Cells */}
                    {displayedDoctors.map((doc) => {
                      // 1. If this slot is during Clinic Break Time -> Render Break Banner
                      if (isBreak) {
                        return (
                          <div
                            key={`${doc.id}-${timeSlot}`}
                            onClick={() => showToast(`Clinic is closed for ${settings.break_label || 'Lunch Break'} (${settings.break_start_time} - ${settings.break_end_time}). No appointments can be scheduled during break.`, 'warning')}
                            className="p-1 border-r border-slate-200 dark:border-slate-800/80 bg-amber-50/40 dark:bg-amber-950/20 cursor-not-allowed flex items-center justify-center"
                          >
                            <div className="w-full h-full rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-100/40 dark:bg-amber-950/40 flex flex-col items-center justify-center p-2 text-center select-none shadow-2xs">
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-800 dark:text-amber-300">
                                <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="truncate">{settings.break_label || 'Lunch Break'}</span>
                              </div>
                              <span className="text-[10px] font-extrabold text-amber-700/90 dark:text-amber-400 mt-0.5">
                                ({settings.break_start_time} - {settings.break_end_time}) • No Consultations
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // 2. Check if this time slot is the START of an appointment
                      const appStarting = appointments.find(
                        a => a.doctor_id === doc.id && a.start_time === timeSlot && a.status !== 'CANCELLED'
                      );

                      // 3. Check if this slot is part of a multi-slot appointment that started earlier
                      const appSpanning = appointments.find(a => {
                        if (a.doctor_id !== doc.id || a.status === 'CANCELLED') return false;
                        const sIdx = timeSlots.indexOf(a.start_time);
                        const curIdx = timeSlots.indexOf(timeSlot);
                        const slots = a.slot_count || 1;
                        return curIdx > sIdx && curIdx < (sIdx + slots);
                      });

                      // If it's part of a multi-slot that already started above, render linked background
                      if (appSpanning) {
                        return (
                          <div
                            key={`${doc.id}-${timeSlot}`}
                            className="border-r border-slate-200 dark:border-slate-800/80 bg-blue-50/20 dark:bg-blue-950/10"
                          />
                        );
                      }

                      if (appStarting) {
                        const pt = patients.find(p => p.id === appStarting.patient_id);
                        const srv = services.find(s => s.id === appStarting.service_id);
                        const slots = appStarting.slot_count || 1;
                        const heightStyle = {
                          height: `calc(${slots * 88}px - 8px)`,
                          zIndex: 10
                        };

                        return (
                          <div
                            key={`${doc.id}-${timeSlot}`}
                            className="p-1 border-r border-slate-200 dark:border-slate-800/80 relative"
                          >
                            <div
                              onClick={() => setActiveAppointment({ ...appStarting, patient: pt, service: srv, doctor: doc })}
                              style={heightStyle}
                              className={`absolute inset-x-1 top-1 rounded-2xl p-3 shadow-sm border flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.005] transition-all ${
                                getStatusBadge(appStarting.status)
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                    {pt ? pt.full_name_en : 'Patient'}
                                  </span>
                                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-2xs shrink-0">
                                    {appStarting.status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                  <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span className="truncate">{srv ? srv.name : 'Dental Service'}</span>
                                </div>

                                {pt?.cpr_number && (
                                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                    CPR: {pt.cpr_number} • {pt.phone}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 mt-1">
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-500" />
                                  {appStarting.start_time} - {appStarting.end_time} ({appStarting.duration_mins || (slots * 30)}m)
                                </span>
                                <span className="font-black text-blue-700 dark:text-blue-300">
                                  {formatCurrency(appStarting.estimated_fee)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Empty Slot -> Click to book with Timing pill on hover
                      return (
                        <div
                          key={`${doc.id}-${timeSlot}`}
                          onClick={() => handleSlotClick(doc.id, timeSlot)}
                          className="p-1 border-r border-slate-200 dark:border-slate-800/80 group hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer flex items-center justify-center transition-colors"
                        >
                          <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-md border border-blue-200 dark:border-blue-800 transition-all transform scale-95 group-hover:scale-100">
                            <div className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Book Slot</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              <Clock className="w-2.5 h-2.5 text-blue-500" />
                              <span>{timeSlot} - {nextSlotTime}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* NEW APPOINTMENT BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Book Dental Appointment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Schedule for {formatDate(selectedDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-4 mt-4">
              
              {/* 1. Patient Selection with Fast Search */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  1. Select Patient (Search by CPR, Mobile, File No, or Name)
                </label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedPatientId={bookingPatientId}
                  onSelectPatient={setBookingPatientId}
                  placeholder="Search patient by Name, CPR, Mobile, File No..."
                />
              </div>

              {/* 2. Doctor & Chair */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    2. Treating Doctor
                  </label>
                  <select
                    value={bookingDoctorId}
                    onChange={(e) => setBookingDoctorId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.chair_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    3. Dental Service / Treatment
                  </label>
                  <select
                    value={bookingServiceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price)} - {s.default_duration_mins}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Slot Configuration & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <select
                    value={bookingStartTime}
                    onChange={(e) => setBookingStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {timeSlots.map(t => {
                      const isBrk = isSlotInBreak(t, settings);
                      return (
                        <option key={t} value={t} disabled={isBrk}>
                          {t} {isBrk ? `⚠️ (${settings.break_label || 'Break Time'} - Closed)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Slots Spanned
                  </label>
                  <select
                    value={bookingSlotCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setBookingSlotCount(count);
                      setBookingDurationMins(count * 30);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value={1}>1 Slot (30 mins)</option>
                    <option value={2}>2 Slots (1 Hour)</option>
                    <option value={3}>3 Slots (1.5 Hours)</option>
                    <option value={4}>4 Slots (2 Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Total Duration
                  </label>
                  <div className="px-3 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white flex items-center justify-between">
                    <span>{bookingDurationMins} Mins</span>
                    <Clock className="w-3.5 h-3.5 text-blue-200" />
                  </div>
                </div>
              </div>

              {/* 4. Chief Complaint & Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Chief Complaint / Reason for Visit
                </label>
                <textarea
                  rows={2}
                  value={bookingChiefComplaint}
                  onChange={(e) => setBookingChiefComplaint(e.target.value)}
                  placeholder="e.g. Toothache, Scaling, Routine checkup, Broken filling..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
                >
                  Confirm Booking
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* APPOINTMENT DETAILS & STATUS UPDATER MODAL */}
      {activeAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getStatusBadge(activeAppointment.status)}`}>
                  {activeAppointment.status}
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                  Appointment Details
                </h3>
              </div>
              <button
                onClick={() => setActiveAppointment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              {/* Patient Info */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl flex items-center gap-3">
                <img
                  src={activeAppointment.patient?.photo_base64 || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt="Patient"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {activeAppointment.patient?.full_name_en}
                  </h4>
                  {activeAppointment.patient?.full_name_ar && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-arabic">
                      {activeAppointment.patient.full_name_ar}
                    </p>
                  )}
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    CPR: {activeAppointment.patient?.cpr_number || 'N/A'} • {activeAppointment.patient?.phone}
                  </p>
                </div>
              </div>

              {/* Service & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Doctor & Chair</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {activeAppointment.doctor?.name}
                  </span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 block">
                    {activeAppointment.doctor?.chair_number}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Time & Duration</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {activeAppointment.start_time} - {activeAppointment.end_time}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {activeAppointment.duration_mins || 30} mins ({activeAppointment.slot_count || 1} slots)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Treatment / Service</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeAppointment.service?.name || 'General Dental Service'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  Fee: {formatCurrency(activeAppointment.estimated_fee)}
                </span>
              </div>

              {activeAppointment.chief_complaint && (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                  <span className="text-amber-700 dark:text-amber-400 block text-[10px] font-bold uppercase">Chief Complaint</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {activeAppointment.chief_complaint}
                  </p>
                </div>
              )}

              {/* Status Update Quick Buttons */}
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase mb-2">
                  Update Appointment Status:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'CHECKED_IN')}
                    className="px-2.5 py-2 rounded-xl font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 transition"
                  >
                    Check In (Waiting)
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'IN_CHAIR')}
                    className="px-2.5 py-2 rounded-xl font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 hover:bg-purple-200 transition"
                  >
                    In Dental Chair
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'COMPLETED')}
                    className="px-2.5 py-2 rounded-xl font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 transition"
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'CANCELLED')}
                    className="px-2.5 py-2 rounded-xl font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (activeAppointment.patient) {
                        onOpenPatientProfile(activeAppointment.patient.id);
                        setActiveAppointment(null);
                      }
                    }}
                    className="col-span-2 px-2.5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    View Patient File & Vitals
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
