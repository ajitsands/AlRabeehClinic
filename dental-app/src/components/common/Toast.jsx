import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100';
      case 'warning':
        return 'border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100';
      case 'error':
        return 'border-rose-500/50 bg-rose-50/90 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100';
      default:
        return 'border-blue-500/50 bg-blue-50/90 dark:bg-blue-950/90 text-blue-900 dark:text-blue-100';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md ${getBorderColor()}`}>
        {getIcon()}
        <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
      </div>
    </div>
  );
}
