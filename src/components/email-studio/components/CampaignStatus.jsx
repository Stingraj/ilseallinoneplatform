import React from 'react';
import { CheckCircle2, AlertOctagon, RotateCcw, Users, ExternalLink, ArrowRight, Settings } from 'lucide-react';

export function CampaignStatus({
  state, // 'sending' | 'success' | 'error'
  contactCount,
  responseMsg,
  errorMsg,
  webhookUrl,
  onRetry,
  onCreateNew,
  onViewContacts,
  onOpenSettings
}) {
  if (state === 'sending') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-lg mx-auto shadow-sm my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
          <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Campaign is being sent
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Delivering {contactCount.toLocaleString()} contacts to your n8n workflow endpoint...
        </p>

        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] bg-slate-100 text-slate-600 font-medium">
            Contacting webhook...
          </span>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-12 space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            Campaign submitted successfully
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            <strong className="text-slate-800">{contactCount.toLocaleString()} contacts</strong> were sent to the email workflow.
          </p>

          {responseMsg && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-700 max-w-sm mx-auto break-words">
              {responseMsg}
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-3">
            Your n8n automation workflow is now processing the recipient list and dispatching through Gmail.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onCreateNew}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
          >
            Create New Campaign
          </button>

          <button
            onClick={onViewContacts}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Contacts</span>
          </button>
        </div>
      </div>
    );
  }

  // Error State
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto shadow-sm my-12 space-y-6 animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
        <AlertOctagon className="w-7 h-7" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Unable to send campaign
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
          We couldn't connect to the email service. Check your webhook URL and try again.
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-rose-800 text-left font-mono break-words">
            {errorMsg}
          </div>
        )}

        <div className="text-[11px] text-slate-400 mt-3 text-left bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
          <div className="font-semibold text-slate-600">Quick troubleshooting checks:</div>
          <div>1. Ensure n8n is running locally (e.g. <code>n8n start</code>).</div>
          <div>2. Make sure the Webhook node is active or listening for test events.</div>
          <div>3. Check if CORS is blocking requests from localhost.</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onRetry}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Check Webhook</span>
        </button>
      </div>
    </div>
  );
}
