import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, User, CreditCard, Phone, FileText } from 'lucide-react';

export default function SearchablePatientSelect({ 
  patients = [], 
  selectedPatientId, 
  onSelectPatient,
  placeholder = "Search patient by Name, CPR, Mobile, File No..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Filter patients based on query
  const filteredPatients = patients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (p.full_name_en && p.full_name_en.toLowerCase().includes(q)) ||
      (p.full_name_ar && p.full_name_ar.includes(q)) ||
      (p.cpr_number && p.cpr_number.includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.file_number && p.file_number.toLowerCase().includes(q))
    );
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (patient) => {
    onSelectPatient(patient.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full min-w-[280px] sm:min-w-[360px] md:min-w-[420px]" ref={dropdownRef}>
      {/* Trigger Button (Select2 Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedPatient ? (
            <>
              <span className="px-2 py-0.5 text-[11px] font-black uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800 shrink-0">
                {selectedPatient.file_number}
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {selectedPatient.full_name_en}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 hidden sm:inline truncate">
                • CPR: {selectedPatient.cpr_number || 'N/A'}
              </span>
            </>
          ) : (
            <span className="text-xs sm:text-sm text-slate-400 font-medium truncate">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {/* Select2-style Searchable Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fadeIn">
          {/* Search Box Input */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
            <div className="relative">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type Name, CPR, Mobile, File No..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Patient Options List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatientId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={p.photo_base64 || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                        alt={p.full_name_en}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm truncate">
                            {p.full_name_en}
                          </span>
                          <span className="px-1.5 py-0.2 text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                            {p.file_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                          <span>CPR: <strong className="text-slate-700 dark:text-slate-300">{p.cpr_number || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Phone: {p.phone}</span>
                          {p.full_name_ar && (
                            <>
                              <span>•</span>
                              <span className="font-arabic">{p.full_name_ar}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                No matching patients found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
