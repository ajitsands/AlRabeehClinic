import React from 'react';
import { MessageCircle, ExternalLink, Globe, ShoppingBag, MapPin, Mail, Phone, X, Sparkles } from 'lucide-react';

export default function SandsLabModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Top-Right Icon */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all focus:outline-none"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gradient Header with Prominent Bigger Logo */}
        <div className="relative px-6 pt-7 pb-6 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white text-center flex flex-col items-center justify-center shadow-inner">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl mb-3.5 border border-white/20 shadow-md">
            <img
              src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png"
              alt="SaNDS Lab Logo"
              className="h-12 sm:h-14 object-contain filter drop-shadow"
              onError={(e) => {
                // Fallback text if network fails
                e.target.style.display = 'none';
              }}
            />
          </div>
          
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
            SaNDS Lab Middle East W.L.L
          </h3>
          <p className="text-xs sm:text-sm font-medium text-purple-100 mt-1 flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Enterprise AI & Smart Automation Systems
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-center">
            Engineers turnkey software solutions for healthcare networks, commercial real-estate towers, and government bodies across Bahrain and the GCC.
          </p>

          {/* Details & Coordinates Box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-4 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-base">📍</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Regional HQ:</span>
              <span className="text-slate-600 dark:text-slate-400">Manama, Kingdom of Bahrain</span>
            </div>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-base">💬</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">WhatsApp / Tel:</span>
              <a 
                href="https://wa.me/97335078079" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                +973 35078079
              </a>
            </div>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-base">✉️</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Official Email:</span>
              <a 
                href="mailto:info@sandslab.com" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                info@sandslab.com
              </a>
            </div>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-base">🌐</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Website:</span>
              <a 
                href="https://www.sandslab.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                https://sandslab.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-base">🛍️</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Product Catalog:</span>
              <a 
                href="https://sandslab.com/products/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-pink-600 dark:text-pink-400 font-medium hover:underline flex items-center gap-1"
              >
                https://sandslab.com/products/ <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            {/* Button 1: WhatsApp Support */}
            <a
              href="https://wa.me/97335078079"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 text-center"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>

            {/* Button 2: Latest Products */}
            <a
              href="https://sandslab.com/products/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border-2 border-blue-500/80 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 text-center"
            >
              <ShoppingBag className="w-4 h-4 text-pink-500" />
              <span>Latest Products ↗</span>
            </a>

            {/* Button 3: Close Button */}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 transition-all text-center"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
