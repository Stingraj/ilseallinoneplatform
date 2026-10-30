'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, AlertOctagon, X } from 'lucide-react';
import { CampaignHeader } from './components/CampaignHeader';
import { EmptyState } from './components/EmptyState';
import { ContactsSection } from './components/ContactsSection';
import { ContactTable } from './components/ContactTable';
import { TemplateSelector } from './components/TemplateSelector';
import { EmailEditor } from './components/EmailEditor';
import { RawHtmlEditor } from './components/RawHtmlEditor';
import { EmailPreview } from './components/EmailPreview';
import { SendSection } from './components/SendSection';
import { ConfirmSendModal } from './components/ConfirmSendModal';
import { CampaignStatus } from './components/CampaignStatus';
import { compileEmailHtml, DEFAULT_TEMPLATE_1, DEFAULT_TEMPLATE_2 } from './utils/emailCompiler';
import { loadSavedState, saveDraft, clearCampaignStorage } from './utils/storage';

// The browser never calls n8n directly. This route checks the studio session and forwards the unchanged payload
// to the n8n webhook configured on the server (see src/app/api/studio/email/send/route.ts).
const CAMPAIGN_RELAY_URL = '/api/studio/email/send';

// `initialDraft` is a server draft (for example an exhibition invitation). When one is open, the browser's own
// saved draft is left untouched so it can still be recovered later.
/** @param {{ initialDraft?: { id: string, subject: string, previewText: string, templateType: string, templateData: object, rawHtml: string | null } | null }} props */
export function EmailStudioApp({ initialDraft = null }) {
  const browserDraft = useMemo(() => loadSavedState(), []);
  const saved = useMemo(
    () =>
      initialDraft
        ? {
            ...browserDraft,
            templateType: initialDraft.templateType || 'custom_announcement',
            template1Data: { ...DEFAULT_TEMPLATE_1, ...(initialDraft.templateData || {}) },
            customRawHtml: initialDraft.rawHtml || null,
            subject: initialDraft.subject || '',
            previewText: initialDraft.previewText || '',
          }
        : browserDraft,
    [browserDraft, initialDraft]
  );
  const [draftId, setDraftId] = useState(initialDraft?.id ?? null);
  const [draftStatus, setDraftStatus] = useState(initialDraft ? 'Opened from the studio' : '');
  // Generated when the owner opens the final confirmation and reused for retries, so the server can refuse to
  // send the same confirmation twice.
  const [operationKey, setOperationKey] = useState(null);
  const [collectorNote, setCollectorNote] = useState('');

  // 3-step navigation: 'contacts' | 'email' | 'send'
  const [activeStep, setActiveStep] = useState('contacts');
  
  // Contacts state (kept in memory, client-side only)
  const [contacts, setContacts] = useState([]);
  const [showImporter, setShowImporter] = useState(false);

  // Email customization state
  const [templateType, setTemplateType] = useState(saved.templateType || 'custom_announcement');
  const [template1Data, setTemplate1Data] = useState(saved.template1Data || DEFAULT_TEMPLATE_1);
  const [template2Data, setTemplate2Data] = useState(saved.template2Data || DEFAULT_TEMPLATE_2);
  const [customRawHtml, setCustomRawHtml] = useState(saved.customRawHtml || null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  // Campaign send settings
  const [subject, setSubject] = useState(saved.subject || 'Special Announcement: What’s New');
  const [previewText, setPreviewText] = useState(saved.previewText || '');
  const [campaignName, setCampaignName] = useState('');
  const webhookUrl = CAMPAIGN_RELAY_URL;

  // Dispatch, Toast & Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [sendResponseMsg, setSendResponseMsg] = useState('');
  const [sendErrorMsg, setSendErrorMsg] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Valid / Invalid breakdown
  const validContacts = useMemo(() => contacts.filter(c => c.isValid), [contacts]);
  const validCount = validContacts.length;
  const invalidCount = contacts.length - validCount;

  // Compile active email HTML
  const compiledHtml = useMemo(() => {
    if (customRawHtml !== null) return customRawHtml;
    const currentData = templateType === 'simple_update' ? template2Data : template1Data;
    return compileEmailHtml(templateType, currentData, previewText);
  }, [templateType, template1Data, template2Data, customRawHtml, previewText]);

  // Determine overall status
  const campaignStatus = useMemo(() => {
    if (sendStatus === 'sending') return 'sending';
    if (sendStatus === 'success') return 'sent';
    if (validCount > 0 && subject.trim().length > 0) return 'ready';
    return 'draft';
  }, [sendStatus, validCount, subject]);

  // Persist state changes (browser drafts only; a server draft is saved explicitly)
  useEffect(() => {
    if (initialDraft) return;
    saveDraft({
      templateType,
      template1Data,
      template2Data,
      customRawHtml,
      subject,
      previewText
    });
  }, [initialDraft, templateType, template1Data, template2Data, customRawHtml, subject, previewText]);

  // Save the composition as a studio draft (creates one, or updates the open one).
  const handleSaveServerDraft = async () => {
    setDraftStatus('Saving…');
    try {
      const res = await fetch('/api/studio/email/drafts', {
        method: draftId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          title: subject.trim() || 'Untitled campaign',
          subject: subject.trim(),
          previewText,
          templateType,
          templateData: templateType === 'simple_update' ? template2Data : template1Data,
          rawHtml: customRawHtml,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Could not save the draft');
      setDraftId(json.id);
      setDraftStatus('Saved to the studio');
    } catch (err) {
      setDraftStatus(err.message || 'Could not save the draft');
    }
  };

  // Add Collectors who agreed to email (the server re-checks consent again when sending).
  const handleAddConsentingCollectors = async () => {
    setCollectorNote('Loading collectors…');
    try {
      const res = await fetch('/api/studio/email/recipients');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Collectors could not be loaded');
      const existing = new Set(contacts.map((c) => c.email.toLowerCase()));
      const added = json.recipients
        .filter((r) => !existing.has(r.email.toLowerCase()))
        .map((r) => ({ id: 'col_' + r.email, email: r.email, name: r.name || r.email.split('@')[0], isValid: true, error: null }));
      setContacts((prev) => [...prev, ...added]);
      setShowImporter(false);
      setCollectorNote(
        `${added.length} collector${added.length === 1 ? '' : 's'} added. Left out: ${json.excluded.withoutConsent} without email consent, ${json.excluded.unsubscribed} unsubscribed.`
      );
    } catch (err) {
      setCollectorNote(err.message || 'Collectors could not be loaded');
    }
  };


  // Reset to visual editor (discard custom raw HTML)
  const handleResetToVisual = () => {
    setCustomRawHtml(null);
    setIsHtmlMode(false);
  };

  // Clear entire campaign
  const handleClearCampaign = () => {
    if (confirm('Are you sure you want to reset this campaign draft and clear all contacts?')) {
      setContacts([]);
      setShowImporter(false);
      setTemplateType('custom_announcement');
      setTemplate1Data(DEFAULT_TEMPLATE_1);
      setTemplate2Data(DEFAULT_TEMPLATE_2);
      setCustomRawHtml(null);
      setSubject('Special Announcement: What’s New');
      setPreviewText('');
      setCampaignName('');
      setSendStatus(null);
      setToast(null);
      clearCampaignStorage();
      setActiveStep('contacts');
    }
  };

  // Webhook Dispatch execution
  const handleExecuteSend = async () => {
    setIsConfirmModalOpen(false);
    setSendStatus('sending');
    setSendResponseMsg('');
    setSendErrorMsg('');

    const payload = {
      contacts: validContacts.map(c => ({
        email: c.email,
        name: c.name || c.email.split('@')[0] || ''
      })),
      subject: subject.trim(),
      body: compiledHtml,
      operationKey,
      ...(draftId ? { draftId } : {}),
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let parsedMsg = text;
      try {
        const json = JSON.parse(text);
        parsedMsg = json.message || JSON.stringify(json);
      } catch (e) {}

      if (res.ok) {
        setSendStatus('success');
        setSendResponseMsg(parsedMsg || 'Workflow was successfully started.');
        showToast('success', parsedMsg || `Campaign dispatched successfully (HTTP ${res.status})`);
      } else {
        setSendStatus('error');
        const errMsg = `Webhook returned HTTP ${res.status}: ${parsedMsg || res.statusText}`;
        setSendErrorMsg(errMsg);
        showToast('error', errMsg);
      }
    } catch (err) {
      console.error('Webhook execution failed:', err);
      setSendStatus('error');
      const errMsg = `Connection failed: ${err.message}`;
      setSendErrorMsg(errMsg);
      showToast('error', errMsg);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-[#FAFAFA] text-slate-900 selection:bg-slate-900 selection:text-white">
      
      {/* 1. Header */}
      <CampaignHeader
        activeStep={activeStep}
        setActiveStep={(step) => {
          setSendStatus(null); // Clear sending screen when navigating back
          setActiveStep(step);
        }}
        status={campaignStatus}
        validContactsCount={validCount}
        totalContactsCount={contacts.length}
        onClearCampaign={handleClearCampaign}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 bg-white px-4 py-2 text-xs sm:px-6">
        <span className="text-slate-500" aria-live="polite">
          {draftId ? 'Studio draft' : 'Browser draft (kept on this device)'}
          {draftStatus ? ` · ${draftStatus}` : ''}
        </span>
        <button type="button" onClick={handleSaveServerDraft} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-slate-400">
          {draftId ? 'Save changes to draft' : 'Save as studio draft'}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">

        {/* If a send state is active (sending, success, error) show status screen */}
        {sendStatus !== null ? (
          <CampaignStatus
            state={sendStatus}
            contactCount={validCount}
            responseMsg={sendResponseMsg}
            errorMsg={sendErrorMsg}
            webhookUrl={webhookUrl}
            onRetry={handleExecuteSend}
            onCreateNew={handleClearCampaign}
            onViewContacts={() => {
              setSendStatus(null);
              setActiveStep('contacts');
            }}
            onOpenSettings={() => {
              setSendStatus(null);
              setActiveStep('send');
            }}
          />
        ) : (
          <>
            {/* STEP 1: CONTACTS */}
            {activeStep === 'contacts' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-slate-600">
                    Only Collectors who agreed to receive email can be sent a campaign; everyone else is removed when you send.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddConsentingCollectors}
                    className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Add collectors with consent
                  </button>
                </div>
                {collectorNote && <p role="status" className="text-xs text-slate-500">{collectorNote}</p>}
                {contacts.length === 0 && !showImporter ? (
                  <EmptyState onAddContacts={() => setShowImporter(true)} />
                ) : (
                  <>
                    {(contacts.length === 0 || showImporter) && (
                      <ContactsSection
                        contacts={contacts}
                        onUpdateContacts={(newContacts) => {
                          setContacts(newContacts);
                          setShowImporter(false);
                        }}
                        onProceedToEmail={() => setActiveStep('email')}
                      />
                    )}

                    {contacts.length > 0 && (
                      <ContactTable
                        contacts={contacts}
                        onRemoveContact={(id) => setContacts(prev => prev.filter(c => c.id !== id))}
                        onRemoveAllInvalid={() => setContacts(prev => prev.filter(c => c.isValid))}
                        onClearList={() => setContacts([])}
                        onAddMore={() => setShowImporter(true)}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 2: EMAIL DESIGN & LIVE PREVIEW */}
            {activeStep === 'email' && (
              <div className="space-y-6">
                {/* Two-column layout on desktop, stacked on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Customize Controls (5 cols) */}
                  <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                    
                    {/* Visual vs Raw HTML Mode Switcher */}
                    <RawHtmlEditor
                      isHtmlMode={isHtmlMode}
                      setIsHtmlMode={setIsHtmlMode}
                      rawHtml={compiledHtml}
                      onResetToVisual={handleResetToVisual}
                      hasCustomHtml={customRawHtml !== null}
                    />

                    {isHtmlMode ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Custom Raw HTML</span>
                          <span className="text-emerald-600 font-mono text-[11px]">Email-Safe Tables</span>
                        </div>
                        <textarea
                          value={compiledHtml}
                          onChange={(e) => setCustomRawHtml(e.target.value)}
                          rows={22}
                          spellCheck={false}
                          className="w-full p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed border border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-y"
                        />
                        <p className="text-[11px] text-slate-400">
                          Direct edits to raw HTML are instantly reflected in the preview on the right.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Template Picker */}
                        <TemplateSelector
                          selectedTemplate={templateType}
                          onSelectTemplate={(type) => {
                            setCustomRawHtml(null);
                            setTemplateType(type);
                          }}
                        />

                        {/* Editor Controls */}
                        <EmailEditor
                          templateType={templateType}
                          template1Data={template1Data}
                          template2Data={template2Data}
                          onChangeTemplate1={(data) => {
                            setCustomRawHtml(null);
                            setTemplate1Data(data);
                          }}
                          onChangeTemplate2={(data) => {
                            setCustomRawHtml(null);
                            setTemplate2Data(data);
                          }}
                        />
                      </>
                    )}

                    {/* Proceed Button */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setActiveStep('contacts')}
                        className="text-xs text-slate-500 hover:text-slate-900 font-medium"
                      >
                        &larr; Back to Contacts
                      </button>

                      <button
                        onClick={() => setActiveStep('send')}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        Next: Review &amp; Send &rarr;
                      </button>
                    </div>

                  </div>

                  {/* Right Column: Live Preview (7 cols) */}
                  <div className="lg:col-span-7 sticky top-24">
                    <EmailPreview
                      htmlContent={compiledHtml}
                      subject={subject}
                      previewText={previewText}
                    />
                  </div>

                </div>
              </div>
            )}

            {/* STEP 3: SEND SECTION */}
            {activeStep === 'send' && (
              <SendSection
                contacts={contacts}
                subject={subject}
                setSubject={setSubject}
                previewText={previewText}
                setPreviewText={setPreviewText}
                campaignName={campaignName}
                setCampaignName={setCampaignName}
                templateType={templateType}
                webhookUrl={webhookUrl}
                onInitiateSend={() => {
                  setOperationKey(crypto.randomUUID());
                  setIsConfirmModalOpen(true);
                }}
              />
            )}
          </>
        )}

      </main>

      {/* Confirmation Modal */}
      <ConfirmSendModal
        isOpen={isConfirmModalOpen}
        count={validCount}
        subject={subject}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleExecuteSend}
        isSending={sendStatus === 'sending'}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium transition-all animate-fadeIn max-w-sm ${
          toast.type === 'success'
            ? 'bg-slate-900 text-white border-slate-700 shadow-slate-950/20'
            : 'bg-rose-950 text-rose-100 border-rose-800 shadow-rose-950/30'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <div className="flex-1 break-words">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
