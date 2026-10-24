import React, { useState } from 'react';
import { Send, Settings, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Users, FileText } from 'lucide-react';

export function SendSection({
  contacts,
  subject,
  setSubject,
  previewText,
  setPreviewText,
  campaignName,
  setCampaignName,
  templateType,
  webhookUrl,
  onInitiateSend
}) {
  const [showWebhookSettings, setShowWebhookSettings] = useState(false);
  const [showPayloadInspector, setShowPayloadInspector] = useState(false);

  const validContacts = contacts.filter(c => c.isValid);
  const validCount = validContacts.length;
  const invalidCount = contacts.length - validCount;

  const canSend = validCount > 0 && subject.trim().length > 0 && webhookUrl.trim().length > 0;

  const templateLabel = templateType === 'simple_update' ? 'Simple Update' : 'Custom Announcement';

  // Sample payload for preview
  const previewPayload = {
    contacts: validContacts.slice(0, 3).map(c => ({
      email: c.email,
      name: c.name || c.email.split('@')[0] || ''
    })).concat(validCount > 3 ? [{ email: `... and ${validCount - 3} more`, name: '...' }] : []),
    subject: subject || '',
    body: '<!DOCTYPE html><html>...</html> (rendered email HTML)'
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Subject Line & Campaign Details */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Campaign Details
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            <span>Email subject</span>
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter your email subject..."
            className="w-full text-sm p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all font-medium"
          />
          {!subject.trim() && (
            <p className="text-[11px] text-amber-600 mt-1">Please enter a subject.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              <span>Preview text</span>
              <span className="text-slate-400 text-[11px] ml-1">(Optional inbox preview)</span>
            </label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Optional preview text..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              <span>Campaign name</span>
              <span className="text-slate-400 text-[11px] ml-1">(Internal reference)</span>
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Q3 Customer Announcement"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Campaign Ready Summary Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Campaign ready</span>
            {validCount > 0 && subject.trim() && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified
              </span>
            )}
          </h3>
          <span className="text-xs text-slate-400">Step 3 of 3</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Contacts</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{contacts.length.toLocaleString()}</div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
            <span className="text-[11px] text-emerald-700 font-medium">Valid</span>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">{validCount.toLocaleString()}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Invalid</span>
            <div className={`text-lg font-bold mt-0.5 ${invalidCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {invalidCount.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Template</span>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate" title={templateLabel}>
              {templateLabel}
            </div>
          </div>
        </div>

        {/* Warning if invalid contacts */}
        {invalidCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{invalidCount} invalid email addresses</strong> will not be sent. Only the {validCount.toLocaleString()} valid addresses will be dispatched.
            </span>
          </div>
        )}

        {/* Big Send Campaign Button */}
        <div className="pt-2">
          <button
            onClick={onInitiateSend}
            disabled={!canSend}
            className="w-full py-4 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 active:scale-[0.99]"
          >
            <Send className="w-5 h-5" />
            <span>Send to {validCount.toLocaleString()} contacts</span>
          </button>

          {!canSend && (
            <div className="text-center text-xs text-slate-400 mt-2">
              {validCount === 0 && 'Add at least one valid contact to enable sending.'}
              {validCount > 0 && !subject.trim() && 'Please enter an email subject line above.'}
              {validCount > 0 && subject.trim() && !webhookUrl.trim() && 'Please enter your n8n webhook URL.'}
            </div>
          )}
        </div>
      </div>

      {/* n8n Webhook Settings Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
        <button
          onClick={() => setShowWebhookSettings(!showWebhookSettings)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>n8n Webhook Endpoint Settings</span>
          </div>
          {showWebhookSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showWebhookSettings && (
          <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <p>
              Campaigns are sent through the studio server, which forwards this exact payload to the n8n webhook set in
              the <code className="font-mono">N8N_*_WEBHOOK_URL</code> environment variables. The webhook address and
              its secret never reach the browser.
            </p>
            <p>
              Dispatch mode is controlled by <code className="font-mono">EMAIL_DISPATCH_MODE</code>:{' '}
              <strong>disabled</strong> (nothing is sent), <strong>test</strong> (test workflow only) or{' '}
              <strong>live</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible JSON Payload Inspector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm text-xs">
        <button
          onClick={() => setShowPayloadInspector(!showPayloadInspector)}
          className="w-full flex items-center justify-between text-slate-500 hover:text-slate-800 font-medium"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Inspect Webhook POST Payload Schema</span>
          </div>
          {showPayloadInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPayloadInspector && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(previewPayload, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
