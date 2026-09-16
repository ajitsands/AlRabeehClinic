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
  Ban,
  Move,
  CalendarSync,
  ArrowRight,
  GripVertical,
  AlertTriangle,
  CalendarX,
  HelpCircle,
  RotateCcw,
  History
} from 'lucide-react';

export default function MultiDoctorCalendar({ onOpenPatientProfile, isModalOpen, setIsModalOpen, preselectedSlot, setPreselectedSlot }) {
  const { formatCurrency, formatDate, showToast, settings, activeBranchId, activeBranch, branches, reconcileDoctorAccounts, currentUser } = useApp();

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

  // Drag & Drop State
  const [draggedAppointment, setDraggedAppointment] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null); // { doctorId, timeSlot }

  // Dedicated Reschedule Modal State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState(timeSlots[0] || '09:00');
  const [rescheduleSlotCount, setRescheduleSlotCount] = useState(1);
  const [rescheduleDurationMins, setRescheduleDurationMins] = useState(30);
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancellation Questionnaire & Confirmation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReasonCategory, setCancelReasonCategory] = useState('Patient Requested (Personal / Schedule Conflict)');
  const [cancelCustomNote, setCancelCustomNote] = useState('');
  const [cancelRescheduleAfter, setCancelRescheduleAfter] = useState(false);
  const [cancelNotifyWhatsApp, setCancelNotifyWhatsApp] = useState(true);

  // Time Slot Cancellation History Popup State
  const [cancelledHistoryModalTarget, setCancelledHistoryModalTarget] = useState(null);

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

  // Load Data with Branch Filtering
  const loadData = async () => {
    if (reconcileDoctorAccounts) {
      await reconcileDoctorAccounts();
    }
    const allDocs = await db.doctors.toArray();
    // Filter active doctors practicing at current active branch
    const docs = allDocs.filter(d => 
      d.is_active !== false && (
        !d.primary_branch_id || 
        d.primary_branch_id === activeBranchId || 
        (d.branches_assigned && d.branches_assigned.includes(activeBranchId))
      )
    );

    const srvs = await db.services.filter(s => s.is_active).toArray();
    const pts = await db.patients.toArray(); // Global access to all patients
    
    // Filter appointments for current date and active branch
    const allApps = await db.appointments.where('appointment_date').equals(selectedDate).toArray();
    const apps = allApps.filter(a => !a.branch_id || a.branch_id === activeBranchId);

    setDoctors(docs.length > 0 ? docs : allDocs.filter(d => d.is_active !== false)); // Fallback to all docs if none mapped
    setServices(srvs);
    setPatients(pts);
    setAppointments(apps);

    if (docs.length > 0) {
      if (!bookingDoctorId || !docs.some(d => d.id === bookingDoctorId)) {
        setBookingDoctorId(docs[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, activeBranchId]);

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

    const bookedByName = currentUser?.full_name || currentUser?.username || 'Clinic Staff';

    const newAppointment = {
      id: `app-${Date.now()}`,
      patient_id: bookingPatientId,
      doctor_id: bookingDoctorId,
      branch_id: activeBranchId,
      service_id: bookingServiceId || null,
      appointment_date: selectedDate,
      start_time: bookingStartTime,
      end_time: calculatedEndTime,
      slot_count: Number(bookingSlotCount),
      duration_mins: Number(bookingDurationMins),
      status: 'CONFIRMED',
      booked_by_id: currentUser?.id || null,
      booked_by_name: bookedByName,
      booked_by_role: currentUser?.role || 'RECEPTIONIST',
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

  // --- DRAG & DROP RESCHEDULING LOGIC ---
  const handleDragStart = (e, appointment) => {
    e.dataTransfer.setData('text/plain', appointment.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAppointment(appointment);
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setDragOverTarget(null);
  };

  const handleDropAppointment = async (targetDoctorId, targetStartTime) => {
    if (!draggedAppointment) return;

    // 1. Same slot check
    if (draggedAppointment.doctor_id === targetDoctorId && draggedAppointment.start_time === targetStartTime) {
      setDraggedAppointment(null);
      setDragOverTarget(null);
      return;
    }

    const targetDoc = doctors.find(d => d.id === targetDoctorId);
    const slotCount = draggedAppointment.slot_count || 1;
    const startIndex = timeSlots.indexOf(targetStartTime);

    if (startIndex === -1) {
      showToast('Invalid time slot', 'error');
      setDraggedAppointment(null);
      setDragOverTarget(null);
      return;
    }

    const endIndex = startIndex + slotCount;
    const calculatedEndTime = timeSlots[endIndex] || settings.clinic_close_time || '17:30';

    // 2. Break Time Check
    for (let i = startIndex; i < endIndex; i++) {
      const slotT = timeSlots[i];
      if (slotT && isSlotInBreak(slotT, settings)) {
        showToast(`Cannot move appointment: Spans into Clinic ${settings.break_label || 'Lunch Break'} (${settings.break_start_time} - ${settings.break_end_time})!`, 'error');
        setDraggedAppointment(null);
        setDragOverTarget(null);
        return;
      }
    }

    // 3. Collision Check for Target Doctor on this date
    const collision = appointments.some(app => {
      if (app.id === draggedAppointment.id || app.doctor_id !== targetDoctorId || app.status === 'CANCELLED') return false;
      const aStart = timeSlots.indexOf(app.start_time);
      const aEnd = aStart + (app.slot_count || 1);
      return Math.max(startIndex, aStart) < Math.min(endIndex, aEnd);
    });

    if (collision) {
      showToast(`Cannot move: Doctor ${targetDoc ? targetDoc.name : ''} already has an appointment at this time!`, 'error');
      setDraggedAppointment(null);
      setDragOverTarget(null);
      return;
    }

    // 4. Update in Dexie & Background Sync
    const pt = patients.find(p => p.id === draggedAppointment.patient_id);
    const updatedData = {
      doctor_id: targetDoctorId,
      start_time: targetStartTime,
      end_time: calculatedEndTime,
      updated_at: new Date().toISOString()
    };

    await db.appointments.update(draggedAppointment.id, updatedData);
    const updated = await db.appointments.get(draggedAppointment.id);
    await syncEngine.queueChange('appointments', draggedAppointment.id, 'UPDATE', updated);

    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    showToast(`Appointment for ${pt ? pt.full_name_en : 'Patient'} rescheduled to ${targetDoc ? targetDoc.name : 'Doctor'} at ${targetStartTime}!`, 'success');

    setDraggedAppointment(null);
    setDragOverTarget(null);
    loadData();
  };

  // --- DEDICATED RESCHEDULE MODAL LOGIC ---
  const handleOpenRescheduleModal = (appointment) => {
    setRescheduleTarget(appointment);
    setRescheduleDate(appointment.appointment_date || selectedDate);
    setRescheduleDoctorId(appointment.doctor_id);
    setRescheduleStartTime(appointment.start_time);
    setRescheduleSlotCount(appointment.slot_count || 1);
    setRescheduleDurationMins(appointment.duration_mins || ((appointment.slot_count || 1) * 30));
    setRescheduleReason('');
    setIsRescheduleModalOpen(true);
    setActiveAppointment(null);
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleDoctorId || !rescheduleDate || !rescheduleStartTime) {
      showToast('Please select Date, Doctor, and Start Time', 'error');
      return;
    }

    const startIndex = timeSlots.indexOf(rescheduleStartTime);
    const count = Number(rescheduleSlotCount);
    const endIndex = startIndex + count;
    const calculatedEndTime = timeSlots[endIndex] || settings.clinic_close_time || '17:30';

    // 1. Break Time Check
    for (let i = startIndex; i < endIndex; i++) {
      const slotT = timeSlots[i];
      if (slotT && isSlotInBreak(slotT, settings)) {
        showToast(`Cannot reschedule: Time spans into Clinic ${settings.break_label || 'Lunch Break'} (${settings.break_start_time} - ${settings.break_end_time})!`, 'error');
        return;
      }
    }

    // 2. Doctor Collision Check on target date
    const targetDateAppointments = await db.appointments
      .where('appointment_date')
      .equals(rescheduleDate)
      .toArray();

    const collision = targetDateAppointments.some(app => {
      if (app.id === rescheduleTarget.id || app.doctor_id !== rescheduleDoctorId || app.status === 'CANCELLED') return false;
      const aStart = timeSlots.indexOf(app.start_time);
      const aEnd = aStart + (app.slot_count || 1);
      return Math.max(startIndex, aStart) < Math.min(endIndex, aEnd);
    });

    if (collision) {
      showToast('Cannot reschedule: Time slot is already booked for this doctor on the selected date!', 'error');
      return;
    }

    const appendNote = rescheduleReason
      ? `${rescheduleTarget.notes ? rescheduleTarget.notes + ' | ' : ''}Rescheduled on ${new Date().toLocaleDateString()}: ${rescheduleReason}`
      : rescheduleTarget.notes;

    const updatedData = {
      appointment_date: rescheduleDate,
      doctor_id: rescheduleDoctorId,
      start_time: rescheduleStartTime,
      end_time: calculatedEndTime,
      slot_count: count,
      duration_mins: Number(rescheduleDurationMins),
      notes: appendNote,
      updated_at: new Date().toISOString()
    };

    await db.appointments.update(rescheduleTarget.id, updatedData);
    const updated = await db.appointments.get(rescheduleTarget.id);
    await syncEngine.queueChange('appointments', rescheduleTarget.id, 'UPDATE', updated);

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    showToast(`Appointment successfully rescheduled to ${rescheduleDate} at ${rescheduleStartTime}!`, 'success');

    setIsRescheduleModalOpen(false);
    setRescheduleTarget(null);

    // Switch calendar date to target date so user immediately sees the rescheduled appointment
    if (rescheduleDate !== selectedDate) {
      setSelectedDate(rescheduleDate);
    } else {
      loadData();
    }
  };

  // --- CANCELLATION QUESTIONNAIRE & CONFIRMATION LOGIC ---
  const handleOpenCancelModal = (appointment) => {
    setCancelTarget(appointment);
    setCancelReasonCategory('Patient Requested (Schedule Conflict / Personal Reason)');
    setCancelCustomNote('');
    setCancelRescheduleAfter(false);
    setCancelNotifyWhatsApp(true);
    setIsCancelModalOpen(true);
    setActiveAppointment(null);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;

    const fullReason = `${cancelReasonCategory}${cancelCustomNote ? ` — Details: ${cancelCustomNote}` : ''}`;
    const logNote = `[CANCELLED on ${new Date().toLocaleDateString()}: ${fullReason}]`;
    const cancelledByName = currentUser?.full_name || currentUser?.username || 'Clinic Staff';

    const updatedData = {
      status: 'CANCELLED',
      cancellation_reason: fullReason,
      cancelled_at: new Date().toISOString(),
      cancelled_by_id: currentUser?.id || null,
      cancelled_by_name: cancelledByName,
      cancelled_by_role: currentUser?.role || 'RECEPTIONIST',
      notes: updatedNotes,
      updated_at: new Date().toISOString()
    };

    await db.appointments.update(cancelTarget.id, updatedData);
    const updated = await db.appointments.get(cancelTarget.id);
    await syncEngine.queueChange('appointments', cancelTarget.id, 'UPDATE', updated);

    const ptName = cancelTarget.patient?.full_name_en || 'Patient';
    showToast(`Appointment for ${ptName} has been cancelled. Reason logged.`, 'info');

    const appointmentToReschedule = cancelTarget;
    setIsCancelModalOpen(false);
    setCancelTarget(null);
    loadData();

    // If user selected to reschedule right after cancelling
    if (cancelRescheduleAfter) {
      handleOpenRescheduleModal(appointmentToReschedule);
    }
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

  // Status Counts for Selected Date & Doctor Filter
  const activeAppointments = selectedDoctorFilter === 'ALL'
    ? appointments
    : appointments.filter(a => a.doctor_id === selectedDoctorFilter);

  const confirmedCount = activeAppointments.filter(a => a.status === 'CONFIRMED' || a.status === 'SCHEDULED' || !a.status).length;
  const checkedInCount = activeAppointments.filter(a => a.status === 'CHECKED_IN').length;
  const inChairCount = activeAppointments.filter(a => a.status === 'IN_CHAIR' || a.status === 'IN_PROGRESS').length;
  const completedCount = activeAppointments.filter(a => a.status === 'COMPLETED').length;

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

          {/* Active Branch Matrix Indicator */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeBranch?.color || '#3B82F6' }}
            />
            <span>{activeBranch?.name || 'Manama'} Matrix</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black">
              {doctors.length} Chairs
            </span>
          </div>
        </div>

        {/* Legend & Stats with Big Bold Count Numbers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Confirmed</span>
            <span className="px-2 py-0.5 text-xs sm:text-sm font-black bg-blue-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-white rounded-md border border-blue-300 dark:border-blue-700">
              {confirmedCount}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Checked-In</span>
            <span className="px-2 py-0.5 text-xs sm:text-sm font-black bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-white rounded-md border border-amber-300 dark:border-amber-700">
              {checkedInCount}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span>In Dental Chair</span>
            <span className="px-2 py-0.5 text-xs sm:text-sm font-black bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-white rounded-md border border-purple-300 dark:border-purple-700">
              {inChairCount}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Completed</span>
            <span className="px-2 py-0.5 text-xs sm:text-sm font-black bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-white rounded-md border border-emerald-300 dark:border-emerald-700">
              {completedCount}
            </span>
          </div>

          {/* Doctor Filter */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
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
          <div style={{ minWidth: `${Math.max(1100, (displayedDoctors.length * 240) + 110)}px` }}>
            
            {/* Table Header: Doctors Side-by-Side */}
            <div className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-20"
              style={{ gridTemplateColumns: `100px repeat(${displayedDoctors.length}, minmax(230px, 1fr))` }}
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
                    className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-xs shrink-0"
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
                    style={{ gridTemplateColumns: `100px repeat(${displayedDoctors.length}, minmax(230px, 1fr))` }}
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

                      // Check if this slot is being dragged over
                      const isHoveredForDrop = dragOverTarget?.doctorId === doc.id && dragOverTarget?.timeSlot === timeSlot;

                      // Check for cancelled bookings in this exact slot to render cancellation history badge
                      const cancelledInSlot = appointments.filter(
                        a => a.doctor_id === doc.id && a.start_time === timeSlot && a.status === 'CANCELLED'
                      );

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
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDragEnter={() => setDragOverTarget({ doctorId: doc.id, timeSlot })}
                            onDrop={() => handleDropAppointment(doc.id, timeSlot)}
                            className="border-r border-slate-200 dark:border-slate-800/80 bg-blue-50/20 dark:bg-blue-950/10"
                          />
                        );
                      }

                      if (appStarting) {
                        const pt = patients.find(p => p.id === appStarting.patient_id);
                        const srv = services.find(s => s.id === appStarting.service_id);
                        const slots = appStarting.slot_count || 1;
                        const isBeingDragged = draggedAppointment?.id === appStarting.id;
                        const heightStyle = {
                          height: `calc(${slots * 88}px - 8px)`,
                          zIndex: 10
                        };

                        return (
                          <div
                            key={`${doc.id}-${timeSlot}`}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDragEnter={() => setDragOverTarget({ doctorId: doc.id, timeSlot })}
                            onDrop={() => handleDropAppointment(doc.id, timeSlot)}
                            className="p-1 border-r border-slate-200 dark:border-slate-800/80 relative"
                          >
                            <div
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, appStarting)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setActiveAppointment({ ...appStarting, patient: pt, service: srv, doctor: doc })}
                              style={heightStyle}
                              className={`absolute inset-x-1 top-1 rounded-2xl p-3 shadow-sm border flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.005] transition-all group ${
                                isBeingDragged ? 'opacity-40 scale-95 border-dashed border-blue-500 ring-2 ring-blue-400' : ''
                              } ${getStatusBadge(appStarting.status)}`}
                              title="Drag to another time/doctor to reschedule, or click for details"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0 cursor-grab" />
                                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                      {pt ? pt.full_name_en : 'Patient'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Previous Cancellation Badge if any occurred in this slot */}
                                    {cancelledInSlot.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCancelledHistoryModalTarget({
                                            doctor: doc,
                                            timeSlot,
                                            cancelledList: cancelledInSlot,
                                            hasActiveBooking: true,
                                            activeAppointment: { ...appStarting, patient: pt, service: srv, doctor: doc }
                                          });
                                        }}
                                        className="px-1.5 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 text-[9px] font-black flex items-center gap-0.5 shadow-2xs cursor-pointer transition"
                                        title="Click to view previous cancelled booking in this time slot"
                                      >
                                        <Ban className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                                        <span>{cancelledInSlot.length} Cancelled</span>
                                      </button>
                                    )}

                                    {/* 1-Click Direct Reschedule Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenRescheduleModal({ ...appStarting, patient: pt, service: srv, doctor: doc });
                                      }}
                                      className="p-1 rounded-lg bg-white/90 dark:bg-slate-800/90 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition shadow-2xs"
                                      title="Reschedule to another Date or Time"
                                    >
                                      <CalendarSync className="w-3 h-3" />
                                    </button>
                                    
                                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-2xs">
                                      {appStarting.status}
                                    </span>
                                  </div>
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

                      // Empty Slot -> Click to book or Drop Target for Drag & Drop
                      return (
                        <div
                          key={`${doc.id}-${timeSlot}`}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDragEnter={() => setDragOverTarget({ doctorId: doc.id, timeSlot })}
                          onDragLeave={() => {
                            if (dragOverTarget?.doctorId === doc.id && dragOverTarget?.timeSlot === timeSlot) {
                              setDragOverTarget(null);
                            }
                          }}
                          onDrop={() => handleDropAppointment(doc.id, timeSlot)}
                          onClick={() => handleSlotClick(doc.id, timeSlot)}
                          className={`p-1 border-r border-slate-200 dark:border-slate-800/80 group cursor-pointer flex items-center justify-center transition-all relative ${
                            isHoveredForDrop
                              ? 'bg-blue-100/70 dark:bg-blue-900/50 ring-2 ring-blue-500 ring-inset'
                              : 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                          }`}
                        >
                          {isHoveredForDrop ? (
                            <div className="flex flex-col items-center justify-center gap-1 text-blue-700 dark:text-blue-300 font-extrabold text-xs animate-bounce">
                              <Move className="w-4 h-4" />
                              <span>Drop to Move ({timeSlot})</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                              {/* Small Cancelled Booking Indicator Badge */}
                              {cancelledInSlot.length > 0 && (
                                <div className="absolute top-1 inset-x-1 flex items-center justify-center z-10">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancelledHistoryModalTarget({
                                        doctor: doc,
                                        timeSlot,
                                        cancelledList: cancelledInSlot,
                                        hasActiveBooking: false
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-rose-50/90 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                    title="Click to view cancellation history for this time slot"
                                  >
                                    <Ban className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>{cancelledInSlot.length === 1 ? '1 Cancelled' : `${cancelledInSlot.length} Cancelled`}</span>
                                  </button>
                                </div>
                              )}

                              {/* Book Slot Prompt on Hover */}
                              <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-md border border-blue-200 dark:border-blue-800 transition-all transform scale-95 group-hover:scale-100 z-20">
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
                          )}
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
                    onClick={() => handleOpenCancelModal(activeAppointment)}
                    className="px-2.5 py-2 rounded-xl font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CalendarX className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => {
                      if (activeAppointment.patient) {
                        onOpenPatientProfile(activeAppointment.patient.id);
                        setActiveAppointment(null);
                      }
                    }}
                    className="col-span-2 px-2.5 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    View Patient File & Vitals
                  </button>
                </div>

                {/* Prominent Reschedule Button */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenRescheduleModal(activeAppointment)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <CalendarSync className="w-4 h-4" />
                    <span>Reschedule (Change Date, Time Slot, or Doctor)</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* DEDICATED RESCHEDULE APPOINTMENT MODAL */}
      {isRescheduleModalOpen && rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <CalendarSync className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Reschedule Dental Appointment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient: <span className="font-bold text-slate-700 dark:text-slate-200">{rescheduleTarget.patient?.full_name_en || 'Patient'}</span> (CPR: {rescheduleTarget.patient?.cpr_number || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRescheduleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4 mt-4">
              
              {/* Current Booking Summary Pill */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Current Scheduled Time</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {rescheduleTarget.appointment_date} • {rescheduleTarget.start_time} - {rescheduleTarget.end_time}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Doctor & Service</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {rescheduleTarget.doctor?.name} • {rescheduleTarget.service?.name}
                  </span>
                </div>
              </div>

              {/* 1. Target Date Selector with Quick Pick Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Choose New Date
                </label>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleDate(new Date().toISOString().split('T')[0])}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                      rescheduleDate === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setRescheduleDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setRescheduleDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setRescheduleDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                  >
                    Next Week
                  </button>
                </div>

                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required
                    className="bg-transparent font-bold text-sm text-slate-900 dark:text-white focus:outline-none w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* 2. Treating Doctor & Chair */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  2. Treating Doctor / Chair
                </label>
                <select
                  value={rescheduleDoctorId}
                  onChange={(e) => setRescheduleDoctorId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.chair_number} - {d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Slot Configuration & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    New Start Time
                  </label>
                  <select
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
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
                    value={rescheduleSlotCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setRescheduleSlotCount(count);
                      setRescheduleDurationMins(count * 30);
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
                    New Duration
                  </label>
                  <div className="px-3 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white flex items-center justify-between">
                    <span>{rescheduleDurationMins} Mins</span>
                    <Clock className="w-3.5 h-3.5 text-blue-200" />
                  </div>
                </div>
              </div>

              {/* 4. Reschedule Reason / Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Reschedule (Optional Note)
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Patient requested morning slot, Doctor emergency..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save Reschedule</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CANCELLATION QUESTIONNAIRE & CONFIRMATION MODAL */}
      {isCancelModalOpen && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-950/80 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-sm">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Cancel Dental Appointment?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient: <span className="font-bold text-slate-800 dark:text-slate-200">{cancelTarget.patient?.full_name_en || 'Patient'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4 mt-4">
              
              {/* Alert Notice */}
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs">
                <div className="flex items-start gap-2 text-rose-800 dark:text-rose-300 font-semibold leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <span>Are you sure you want to cancel the booking for </span>
                    <span className="font-bold underline">{cancelTarget.patient?.full_name_en}</span>
                    <span> with </span>
                    <span className="font-bold">{cancelTarget.doctor?.name}</span>
                    <span> on </span>
                    <span className="font-bold">{cancelTarget.appointment_date} at {cancelTarget.start_time}</span>?
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-normal mt-1">
                      This will free up Chair {cancelTarget.doctor?.chair_number} for other patients. Please specify the reason below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 1: Cancellation Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. Why is this appointment being cancelled?</span>
                </label>
                <div className="space-y-1.5">
                  {[
                    'Patient Requested (Schedule Conflict / Personal Reason)',
                    'Patient Did Not Show Up (No-Show)',
                    'Doctor Emergency / Doctor Unavailable',
                    'Feeling Better / Treatment Postponed by Patient',
                    'Financial / Insurance Coverage Concern',
                    'Other Reason'
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        cancelReasonCategory === reason
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={cancelReasonCategory === reason}
                        onChange={(e) => setCancelReasonCategory(e.target.value)}
                        className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Question 2: Specific Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  2. Additional Note or Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelCustomNote}
                  onChange={(e) => setCancelCustomNote(e.target.value)}
                  placeholder="e.g. Patient called to postpone due to work travel; promised to call next Tuesday..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Option: Immediately Reschedule After Cancellation */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/50">
                <label className="flex items-center gap-2.5 text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelRescheduleAfter}
                    onChange={(e) => setCancelRescheduleAfter(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Immediately open Reschedule tool to book a replacement slot</span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  No, Keep Appointment
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/25 transition cursor-pointer"
                >
                  <CalendarX className="w-4 h-4" />
                  <span>Yes, Cancel Appointment</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* TIME SLOT CANCELLATION HISTORY POPUP MODAL */}
      {cancelledHistoryModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Slot Cancellation History</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black border border-rose-300 dark:border-rose-800">
                      {cancelledHistoryModalTarget.cancelledList.length} Cancelled
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dr. {cancelledHistoryModalTarget.doctor?.name} (Chair {cancelledHistoryModalTarget.doctor?.chair_number || '1'}) • {formatDate(selectedDate)} at {cancelledHistoryModalTarget.timeSlot}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCancelledHistoryModalTarget(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Slot Availability Status Banner */}
            <div className={`my-4 p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              cancelledHistoryModalTarget.hasActiveBooking
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {cancelledHistoryModalTarget.hasActiveBooking ? (
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div>
                  <span className="font-black text-sm">
                    {cancelledHistoryModalTarget.hasActiveBooking
                      ? `Slot Currently Booked: ${cancelledHistoryModalTarget.activeAppointment?.patient?.full_name_en || 'Active Patient'}`
                      : 'This Time Slot is Open & Available for New Bookings!'}
                  </span>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {cancelledHistoryModalTarget.hasActiveBooking
                      ? `Service: ${cancelledHistoryModalTarget.activeAppointment?.service?.name || 'Consultation'}`
                      : 'You can take another appointment in this exact slot.'}
                  </p>
                </div>
              </div>

              {!cancelledHistoryModalTarget.hasActiveBooking && (
                <button
                  type="button"
                  onClick={() => {
                    const docId = cancelledHistoryModalTarget.doctor.id;
                    const slot = cancelledHistoryModalTarget.timeSlot;
                    setCancelledHistoryModalTarget(null);
                    handleSlotClick(docId, slot);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book This Slot Now</span>
                </button>
              )}
            </div>

            {/* List of Cancelled Bookings */}
            <div className="space-y-3 mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>Cancelled Bookings Log ({cancelledHistoryModalTarget.cancelledList.length})</span>
              </h4>

              {cancelledHistoryModalTarget.cancelledList.map((app, idx) => {
                const pt = patients.find(p => p.id === app.patient_id);
                const srv = services.find(s => s.id === app.service_id);
                return (
                  <div
                    key={app.id || idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                            {pt ? pt.full_name_en : 'Patient Record'}
                          </h5>
                          {pt?.full_name_ar && (
                            <p className="text-xs text-slate-500 font-arabic">{pt.full_name_ar}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {pt?.file_number && (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                            File #{pt.file_number}
                          </span>
                        )}

                        {/* Cancelled Person Tag Near Cancel Tag */}
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900 flex items-center gap-1 shadow-2xs">
                          <UserCheck className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Cancelled By: <strong className="font-black">{app.cancelled_by_name || 'Clinic Staff'}</strong></span>
                        </span>

                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                          CANCELLED
                        </span>
                      </div>
                    </div>

                    {/* Patient CPR & Contact Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs py-2 border-y border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">CPR Number</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{pt?.cpr_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{pt?.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Service & Fee</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 truncate block">
                          {srv ? srv.name : 'Consultation'} ({formatCurrency(app.estimated_fee)})
                        </span>
                      </div>
                    </div>

                    {/* Confirmation Block & Cancellation Block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* 1. Confirmation / Initial Booking Block */}
                      <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-blue-500" />
                            <span>Confirmation & Booking</span>
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            Booked
                          </span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                          Booked By: <span className="text-blue-600 dark:text-blue-400">{app.booked_by_name || 'Clinic Staff'}</span>
                        </p>
                        {app.created_at && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Created: {new Date(app.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* 2. Cancellation Block */}
                      <div className="p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Cancellation Record</span>
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                            Cancelled
                          </span>
                        </div>
                        <p className="text-rose-900 dark:text-rose-200 font-bold text-[11px]">
                          Cancelled By: <span className="text-rose-700 dark:text-rose-300">{app.cancelled_by_name || 'Clinic Staff'}</span>
                        </p>
                        {app.cancelled_at && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">
                            Cancelled on: {new Date(app.cancelled_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cancellation Reason Box */}
                    <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                      <div className="flex items-start gap-1.5 text-rose-900 dark:text-rose-200 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>Reason: {app.cancellation_reason || 'Cancelled by clinic / patient'}</span>
                      </div>
                      {app.notes && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 pl-5 italic">
                          Notes: {app.notes}
                        </div>
                      )}
                    </div>

                    {/* Rebook / Reschedule Patient Button */}
                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const appToReschedule = { ...app, patient: pt, service: srv, doctor: cancelledHistoryModalTarget.doctor };
                          setCancelledHistoryModalTarget(null);
                          handleOpenRescheduleModal(appToReschedule);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Rebook / Reschedule {pt?.full_name_en ? pt.full_name_en.split(' ')[0] : 'Patient'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Footer Close */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
              <button
                type="button"
                onClick={() => setCancelledHistoryModalTarget(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


