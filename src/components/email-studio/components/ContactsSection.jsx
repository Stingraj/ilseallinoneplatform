import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Clipboard, Check, ArrowRight, X } from 'lucide-react';
import { parsePastedEmails, analyzeCSV, importFromCSVRows } from '../utils/contactParser';

export function ContactsSection({ contacts, onUpdateContacts, onProceedToEmail }) {
  const [importMode, setImportMode] = useState('paste'); // 'paste' | 'file'
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null); // { columns, detectedColumnIndex, rows, totalRows }
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Handle Paste Import
  const handleImportPasted = () => {
    if (!pastedText.trim()) return;
    const { contacts: updatedContacts, addedCount } = parsePastedEmails(pastedText, contacts);
    onUpdateContacts(updatedContacts);
    setPastedText('');
    setImportSuccessMsg(`Added ${addedCount.toLocaleString()} new unique contacts!`);
    setTimeout(() => setImportSuccessMsg(''), 4000);
  };

  // Handle File Drag & Drop / Selection
  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();

    if (file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        const text = e.target.result;
        const { contacts: updatedContacts, addedCount } = parsePastedEmails(text, contacts);
        onUpdateContacts(updatedContacts);
        setImportSuccessMsg(`Imported ${addedCount.toLocaleString()} contacts from ${file.name}`);
        setTimeout(() => setImportSuccessMsg(''), 4000);
      };
      reader.readAsText(file);
    } else {
      // Treat as CSV or plain text
      reader.onload = (e) => {
        const text = e.target.result;
        const analysis = analyzeCSV(text);
        if (analysis.columns.length <= 1) {
          // Single column or raw text
          const { contacts: updatedContacts, addedCount } = parsePastedEmails(text, contacts);
          onUpdateContacts(updatedContacts);
          setImportSuccessMsg(`Imported ${addedCount.toLocaleString()} contacts from ${file.name}`);
          setTimeout(() => setImportSuccessMsg(''), 4000);
        } else {
          // Multi-column CSV detected -> prompt user with column picker
          setCsvPreview(analysis);
          setSelectedColumnIndex(analysis.detectedColumnIndex >= 0 ? analysis.detectedColumnIndex : 0);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmCsvImport = () => {
    if (!csvPreview) return;
    const { contacts: updatedContacts, addedCount } = importFromCSVRows(
      csvPreview.rows,
      selectedColumnIndex,
      contacts,
      csvPreview.detectedNameColumnIndex
    );
    onUpdateContacts(updatedContacts);
    setCsvPreview(null);
    setImportSuccessMsg(`Imported ${addedCount.toLocaleString()} contacts from CSV!`);
    setTimeout(() => setImportSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Add your contacts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add up to 2,000 email addresses for this campaign. Cleaned and deduplicated in your browser.
          </p>
        </div>

        {contacts.length > 0 && (
          <button
            onClick={onProceedToEmail}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
          >
            <span>Design Email</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {importSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* CSV Column Picker Modal / Overlay if file has multiple columns */}
      {csvPreview && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Email column detected</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                We found {csvPreview.columns.length} columns and {csvPreview.totalRows.toLocaleString()} rows. Please confirm which column contains email addresses:
              </p>
            </div>
            <button
              onClick={() => setCsvPreview(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Email Column</label>
              <select
                value={selectedColumnIndex}
                onChange={(e) => setSelectedColumnIndex(parseInt(e.target.value, 10))}
                className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {csvPreview.columns.map((col, idx) => (
                  <option key={idx} value={idx}>
                    {col} {idx === csvPreview.detectedColumnIndex ? '(Detected)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-700">Sample value:</span>{' '}
              <span className="font-mono text-slate-900">
                {csvPreview.rows[0]?.[selectedColumnIndex] || '(Empty)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setCsvPreview(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCsvImport}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
            >
              Import from Column
            </button>
          </div>
        </div>
      )}

      {/* Two Import Options: Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        
        {/* Toggle Option A vs Option B */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
          <button
            onClick={() => setImportMode('paste')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              importMode === 'paste'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Option A — Paste Emails</span>
          </button>

          <button
            onClick={() => setImportMode('file')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              importMode === 'file'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Option B — Upload Contact File</span>
          </button>
        </div>

        {/* Option A: Paste Emails */}
        {importMode === 'paste' && (
          <div className="space-y-3">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste email addresses here... (one per line, comma or semicolon separated)"
              rows={6}
              className="w-full p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all resize-y"
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Duplicates, extra spaces, and empty lines are removed automatically.
              </span>
              <button
                onClick={handleImportPasted}
                disabled={!pastedText.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all self-end sm:self-auto"
              >
                <span>Process & Add Contacts</span>
              </button>
            </div>
          </div>
        )}

        {/* Option B: Upload Contact File */}
        {importMode === 'file' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all ${
              isDragging
                ? 'border-slate-900 bg-slate-50 scale-[0.99]'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center mx-auto mb-3 text-slate-700">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-semibold text-slate-900">
              Drop your contact file here
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              CSV or TXT • Up to 2,000 contacts
            </p>

            <div className="mt-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-sm transition-all"
              >
                <span>Browse files</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              Files are parsed 100% locally in your browser. Never uploaded to any server.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
