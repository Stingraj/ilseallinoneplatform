import React from 'react';
import { Mail, Check, RotateCcw, AlertCircle } from 'lucide-react';

export function CampaignHeader({
  activeStep,
  setActiveStep,
  status,
  validContactsCount,
  totalContactsCount,
  onClearCampaign
}) {
  const steps = [
    { id: 'contacts', label: 'Contacts', num: 1, ready: totalContactsCount > 0 },
    { id: 'email', label: 'Email', num: 2, ready: true },
    { id: 'send', label: 'Send', num: 3, ready: validContactsCount > 0 }
  ];

  const statusBadges = {
    draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    ready: { label: 'Ready to Send', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sending: { label: 'Sending...', bg: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' },
    sent: { label: 'Sent', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
  };

  const currentBadge = statusBadges[status] || statusBadges.draft;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-slate-900 leading-none">Email Campaign Studio</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">n8n + Gmail Dispatcher</p>
          </div>
        </div>

        {/* 3-Step Navigation */}
        <nav className="flex items-center bg-slate-100/90 p-1 rounded-lg border border-slate-200/60 text-xs">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {step.num}
                </span>
                <span>{step.label}</span>
                {idx < steps.length - 1 && (
                  <span className="text-slate-300 ml-1">/</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${currentBadge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'ready' ? 'bg-emerald-500' : status === 'sending' ? 'bg-amber-500' : 'bg-slate-400'}`} />
            {currentBadge.label}
          </span>

          <button
            onClick={onClearCampaign}
            title="Clear current campaign draft"
            className="text-xs text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

      </div>
    </header>
  );
}
