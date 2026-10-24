import React from 'react';
import { Users, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export function EmptyState({ onAddContacts }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm my-8">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-slate-800 border border-slate-200/60 shadow-inner">
        <Users className="w-7 h-7" />
      </div>
      
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
        Create your first campaign
      </h2>
      
      <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
        Add your contacts and build a beautiful email in minutes. Seamlessly dispatch through your n8n automation workflow.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onAddContacts}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.98]"
        >
          <span>Add Contacts</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 pt-8 border-t border-slate-100 text-left">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-800">100% Client-Side Privacy</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Contacts are processed in your browser. No external database or Google Sheets required.</div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <Zap className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-800">Single n8n Webhook</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Delivers a clean JSON contact list directly to your Gmail batch sending node.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
