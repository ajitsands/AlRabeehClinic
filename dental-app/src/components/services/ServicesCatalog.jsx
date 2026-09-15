import React, { useState, useEffect } from 'react';
import { db } from '../../db/indexedDB';
import { useApp } from '../../context/AppContext';
import { syncEngine } from '../../services/syncEngine';
import { 
  Sparkles, 
  Plus, 
  Clock, 
  Tag, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  X, 
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  DollarSign
} from 'lucide-react';

export default function ServicesCatalog() {
  const { formatCurrency, showToast } = useApp();
  const [services, setServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [sortBy, setSortBy] = useState('NAME_ASC');

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Diagnostic');
  const [formDuration, setFormDuration] = useState(30);
  const [formSlots, setFormSlots] = useState(1);
  const [formPrice, setFormPrice] = useState(20.000);
  const [formDescription, setFormDescription] = useState('');

  const loadServices = async () => {
    const list = await db.services.toArray();
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenModal = (srv = null) => {
    if (srv) {
      setEditingService(srv);
      setFormName(srv.name);
      setFormCategory(srv.category);
      setFormDuration(srv.default_duration_mins);
      setFormSlots(srv.required_slots);
      setFormPrice(srv.price);
      setFormDescription(srv.description || '');
    } else {
      setEditingService(null);
      setFormName('');
      setFormCategory('Restorative');
      setFormDuration(30);
      setFormSlots(1);
      setFormPrice(25.000);
      setFormDescription('');
    }
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!formName) {
      showToast('Please enter Service Name', 'error');
      return;
    }

    const srvData = {
      id: editingService ? editingService.id : `srv-${Date.now()}`,
      name: formName,
      category: formCategory,
      default_duration_mins: Number(formDuration),
      required_slots: Number(formSlots),
      price: Number(formPrice),
      description: formDescription,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    if (editingService) {
      await db.services.put(srvData);
      await syncEngine.queueChange('services', srvData.id, 'UPDATE', srvData);
      showToast('Service updated successfully', 'success');
    } else {
      await db.services.add(srvData);
      await syncEngine.queueChange('services', srvData.id, 'INSERT', srvData);
      showToast('New dental service added', 'success');
    }

    setIsModalOpen(false);
    loadServices();
  };

  const handleToggleActive = async (srv) => {
    const updated = { ...srv, is_active: !srv.is_active };
    await db.services.put(updated);
    await syncEngine.queueChange('services', srv.id, 'UPDATE', updated);
    showToast(`Service "${srv.name}" status updated`, 'info');
    loadServices();
  };

  // Filter & Search Logic across Title, Price, Slot Duration, Category
  const filteredServices = services.filter((srv) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = srv.name && srv.name.toLowerCase().includes(q);
      const categoryMatch = srv.category && srv.category.toLowerCase().includes(q);
      const descMatch = srv.description && srv.description.toLowerCase().includes(q);
      
      // Price search matching (e.g. typing "25", "25.000", "50", "120")
      const priceStr = String(srv.price || '');
      const priceFormatted = formatCurrency(srv.price).toLowerCase();
      const priceMatch = priceStr.includes(q) || priceFormatted.includes(q);

      // Duration & Slot matching (e.g. typing "30", "60", "90", "30m", "1 slot", "2 slots")
      const durationStr = String(srv.default_duration_mins || '');
      const slotStr = String(srv.required_slots || '');
      const durationMatch = 
        durationStr.includes(q) ||
        `${durationStr}m`.includes(q) ||
        `${durationStr} min`.includes(q) ||
        `${durationStr} mins`.includes(q) ||
        slotStr === q ||
        `${slotStr} slot`.includes(q) ||
        `${slotStr} slots`.includes(q);

      if (!nameMatch && !categoryMatch && !descMatch && !priceMatch && !durationMatch) {
        return false;
      }
    }

    // 2. Category Filter
    if (selectedCategory !== 'ALL' && srv.category !== selectedCategory) {
      return false;
    }

    // 3. Duration Filter
    if (selectedDuration !== 'ALL') {
      if (selectedDuration === '30' && srv.default_duration_mins !== 30) return false;
      if (selectedDuration === '60' && srv.default_duration_mins !== 60) return false;
      if (selectedDuration === '90' && srv.default_duration_mins !== 90) return false;
      if (selectedDuration === '120+' && srv.default_duration_mins < 120) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return a.price - b.price;
    if (sortBy === 'PRICE_DESC') return b.price - a.price;
    if (sortBy === 'DURATION_ASC') return a.default_duration_mins - b.default_duration_mins;
    if (sortBy === 'DURATION_DESC') return b.default_duration_mins - a.default_duration_mins;
    return a.name.localeCompare(b.name);
  });

  const allCategories = ['ALL', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
            Dental Services & Pricing Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define procedure durations, required calendar slot count, and standard tariffs
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Dental Service</span>
        </button>
      </div>

      {/* Search & Filter Center */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Main Multi-field Search Input (Title, Price, Duration) */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Title (e.g. Root Canal), Price (e.g. 25), Duration (e.g. 30m, 60m, 1 slot)..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories ({services.length})</option>
                {allCategories.filter(c => c !== 'ALL').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Duration / Slot Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Durations</option>
                <option value="30">30 mins (1 Slot)</option>
                <option value="60">60 mins (2 Slots)</option>
                <option value="90">90 mins (3 Slots)</option>
                <option value="120+">120+ mins (4+ Slots)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="NAME_ASC">Name (A to Z)</option>
                <option value="PRICE_ASC">Price (Lowest First)</option>
                <option value="PRICE_DESC">Price (Highest First)</option>
                <option value="DURATION_ASC">Duration (Shortest First)</option>
                <option value="DURATION_DESC">Duration (Longest First)</option>
              </select>
            </div>

          </div>

        </div>

        {/* Status Count / Filter Feedback Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2 font-semibold">
            <span>Showing <span className="font-extrabold text-blue-600 dark:text-blue-400">{filteredServices.length}</span> of {services.length} services</span>
            {(searchQuery || selectedCategory !== 'ALL' || selectedDuration !== 'ALL') && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                Filtered
              </span>
            )}
          </div>

          {(searchQuery || selectedCategory !== 'ALL' || selectedDuration !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedDuration('ALL');
              }}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Services Grid - 4 Cards in One Row */}
      {filteredServices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-2 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No matching dental services found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Try searching by another title keyword, price value (e.g. 25), or duration (e.g. 30m, 60m).
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedDuration('ALL');
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5">
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    {srv.category}
                  </span>
                  
                  <button
                    onClick={() => handleToggleActive(srv)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                      srv.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {srv.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {srv.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {srv.description || 'Standard clinical dental procedure'}
                </p>

                {/* Slot and Pricing specs */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800 my-3">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Slot Span</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {srv.required_slots} {srv.required_slots === 1 ? 'Slot' : 'Slots'} ({srv.default_duration_mins}m)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Standard Fee</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(srv.price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleOpenModal(srv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Service</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingService ? 'Edit Dental Service' : 'Add New Dental Service'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 mt-4 text-xs">
              
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Service / Procedure Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Scaling & Root Planing"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Restorative">Restorative</option>
                    <option value="Endodontics">Endodontics</option>
                    <option value="Periodontics">Periodontics</option>
                    <option value="Oral Surgery">Oral Surgery</option>
                    <option value="Orthodontics">Orthodontics</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Implantology">Implantology</option>
                    <option value="Pediatric">Pediatric</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Standard Fee
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Slot Count & Duration */}
              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-900">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Required Calendar Slots
                  </label>
                  <select
                    value={formSlots}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setFormSlots(count);
                      setFormDuration(count * 30);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value={1}>1 Slot (30 mins)</option>
                    <option value={2}>2 Slots (1 Hour)</option>
                    <option value={3}>3 Slots (1.5 Hours)</option>
                    <option value={4}>4 Slots (2 Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Procedure Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Details of the treatment..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
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
                  Save Service
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
