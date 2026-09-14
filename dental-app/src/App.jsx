import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import HorizontalNavbar from './components/navigation/HorizontalNavbar';
import MultiDoctorCalendar from './components/calendar/MultiDoctorCalendar';
import PatientListAndRegistration from './components/patients/PatientListAndRegistration';
import VitalsAndAttachmentsManager from './components/vitals/VitalsAndAttachmentsManager';
import DoctorManagement from './components/doctors/DoctorManagement';
import ServicesCatalog from './components/services/ServicesCatalog';
import SettingsView from './components/settings/SettingsView';
import Toast from './components/common/Toast';
import SandsLabModal from './components/common/SandsLabModal';
import { Sparkles } from 'lucide-react';

function DentalClinicApp() {
  const { activeTab, setActiveTab } = useApp();
  
  // Global modal triggers
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState(null);
  const [isSandsModalOpen, setIsSandsModalOpen] = useState(false);

  const handleSelectPatientProfile = (patientId) => {
    setSelectedPatientForProfile(patientId);
    setActiveTab('vitals');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Horizontal Navbar */}
      <HorizontalNavbar
        onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
        onOpenNewAppointment={() => setIsNewAppointmentModalOpen(true)}
      />

      {/* Main Content Area - Maximized Workspace with Minimal Edge Margins */}
      <main className="flex-1 w-full px-1.5 sm:px-2.5 md:px-3 py-2">
        
        {/* TAB 1: Appointments & Single-Window Multi-Doctor Calendar Matrix */}
        {activeTab === 'appointments' && (
          <MultiDoctorCalendar
            onOpenPatientProfile={handleSelectPatientProfile}
            isModalOpen={isNewAppointmentModalOpen}
            setIsModalOpen={setIsNewAppointmentModalOpen}
          />
        )}

        {/* TAB 2: Patients & CPR Smart Card Registry */}
        {activeTab === 'patients' && (
          <PatientListAndRegistration
            isRegisterModalOpen={isNewPatientModalOpen}
            setIsRegisterModalOpen={setIsNewPatientModalOpen}
            onSelectPatient={handleSelectPatientProfile}
          />
        )}

        {/* TAB 3: Vitals & Clinical Attachments (Up to 100MB) */}
        {activeTab === 'vitals' && (
          <VitalsAndAttachmentsManager
            activePatientId={selectedPatientForProfile}
            onBackToList={() => setActiveTab('patients')}
          />
        )}

        {/* TAB 4: Doctors & Dental Chairs */}
        {activeTab === 'doctors' && (
          <DoctorManagement />
        )}

        {/* TAB 5: Dental Services Catalog & Fees */}
        {activeTab === 'services' && (
          <ServicesCatalog />
        )}

        {/* TAB 6: Settings & Gulf/India Localization */}
        {activeTab === 'settings' && (
          <SettingsView />
        )}

      </main>

      {/* Global Toast Notification System */}
      <Toast />

      {/* SaNDS Lab Interactive Information Modal */}
      <SandsLabModal
        isOpen={isSandsModalOpen}
        onClose={() => setIsSandsModalOpen(false)}
      />

      {/* Footer with Powered By SaNDS Lab */}
      <footer className="py-3 px-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Al Rabeesh Dental Software v1.0 • Offline-First (IndexedDB & SQLite Sync)</span>
          <span className="hidden md:inline">• Bahrain Smart Card Active</span>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsSandsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all shadow-xs group"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-12 transition-transform" />
            <span>Powered By</span>
            <span className="font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent group-hover:underline">
              SaNDS Lab
            </span>
          </button>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DentalClinicApp />
    </AppProvider>
  );
}
