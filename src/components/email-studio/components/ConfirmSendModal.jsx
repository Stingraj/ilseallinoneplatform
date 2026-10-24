import React from 'react';
import { Send, AlertCircle, X } from 'lucide-react';

export function ConfirmSendModal({ isOpen, count, subject, onCancel, onConfirm, isSending }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200/80 space-y-5 animate-scaleUp">
        
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
            <Send className="w-5 h-5" />
          </div>
          <button
            onClick={onCancel}
            disabled={isSending}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Ready to send?
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            This campaign will be sent to <strong className="text-slate-800">{count.toLocaleString()} contacts</strong>.
          </p>
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
            <span className="font-medium text-slate-400 uppercase text-[10px] block mb-0.5">Subject</span>
            <span className="font-semibold text-slate-800">{subject}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSending}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Campaign</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
