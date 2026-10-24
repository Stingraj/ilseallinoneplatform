import React, { useState } from 'react';
import { Monitor, Smartphone, Copy, Check } from 'lucide-react';

export function EmailPreview({ htmlContent, subject, previewText }) {
  const [viewport, setViewport] = useState('desktop'); // 'desktop' (600px) | 'mobile' (375px)
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Inbox Preview Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 tracking-tight">Inbox Preview</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">&bull; Live email client rendering</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop / Mobile Switcher */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewport('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                viewport === 'desktop'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>

            <button
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                viewport === 'mobile'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Copy HTML Button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
            title="Copy compiled email HTML code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy HTML'}</span>
          </button>
        </div>
      </div>

      {/* Simulated Email Client Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/60 text-xs flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase w-12 shrink-0">Subject:</span>
          <span className="font-semibold text-slate-900 truncate">
            {subject || '(No subject entered)'}
          </span>
        </div>
        {previewText && (
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase w-12 shrink-0">Preview:</span>
            <span className="text-slate-500 truncate">{previewText}</span>
          </div>
        )}
      </div>

      {/* Sandboxed Iframe Preview Stage */}
      <div className="flex-1 bg-slate-100/70 p-4 sm:p-6 overflow-x-auto flex justify-center items-start min-h-[520px]">
        <div
          className={`bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden transition-all duration-300 w-full ${
            viewport === 'mobile' ? 'max-w-[375px] rounded-3xl border-4 border-slate-800' : 'max-w-[600px]'
          }`}
        >
          <iframe
            title="Email Preview Frame"
            srcDoc={htmlContent}
            sandbox="allow-same-origin"
            className="w-full h-[620px] border-none block bg-white"
          />
        </div>
      </div>

    </div>
  );
}
