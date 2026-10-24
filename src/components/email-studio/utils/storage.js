export const DEFAULT_WEBHOOK_URL = 'http://localhost:5678/webhook/email-campaign';

const STORAGE_KEYS = {
  WEBHOOK_URL: 'esc_webhook_url',
  TEMPLATE_TYPE: 'esc_template_type',
  TEMPLATE_1_DATA: 'esc_template_1_data',
  TEMPLATE_2_DATA: 'esc_template_2_data',
  CUSTOM_RAW_HTML: 'esc_custom_raw_html',
  SUBJECT: 'esc_subject',
  PREVIEW_TEXT: 'esc_preview_text',
};

export function loadSavedState() {
  try {
    let webhookUrl = localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL);
    if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK_ID') || webhookUrl.includes('7b7080c5-9fa9-4822-8132-ee6c78423f73')) {
      webhookUrl = DEFAULT_WEBHOOK_URL;
      localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, webhookUrl);
    }

    const templateType = localStorage.getItem(STORAGE_KEYS.TEMPLATE_TYPE) || 'custom_announcement';
    const template1Data = localStorage.getItem(STORAGE_KEYS.TEMPLATE_1_DATA)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATE_1_DATA))
      : null;
    const template2Data = localStorage.getItem(STORAGE_KEYS.TEMPLATE_2_DATA)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATE_2_DATA))
      : null;
    const customRawHtml = localStorage.getItem(STORAGE_KEYS.CUSTOM_RAW_HTML) || null;
    const subject = localStorage.getItem(STORAGE_KEYS.SUBJECT) || 'Special Announcement: What’s New';
    const previewText = localStorage.getItem(STORAGE_KEYS.PREVIEW_TEXT) || '';

    return {
      webhookUrl,
      templateType,
      template1Data,
      template2Data,
      customRawHtml,
      subject,
      previewText
    };
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
    return {
      webhookUrl: DEFAULT_WEBHOOK_URL,
      templateType: 'custom_announcement',
      template1Data: null,
      template2Data: null,
      customRawHtml: null,
      subject: 'Special Announcement: What’s New',
      previewText: ''
    };
  }
}

export function saveWebhookUrl(url) {
  try {
    localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, url);
  } catch (e) {}
}

export function saveDraft(state) {
  try {
    if (state.templateType) localStorage.setItem(STORAGE_KEYS.TEMPLATE_TYPE, state.templateType);
    if (state.template1Data) localStorage.setItem(STORAGE_KEYS.TEMPLATE_1_DATA, JSON.stringify(state.template1Data));
    if (state.template2Data) localStorage.setItem(STORAGE_KEYS.TEMPLATE_2_DATA, JSON.stringify(state.template2Data));
    if (state.customRawHtml !== undefined) {
      if (state.customRawHtml === null) {
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_RAW_HTML);
      } else {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_RAW_HTML, state.customRawHtml);
      }
    }
    if (state.subject !== undefined) localStorage.setItem(STORAGE_KEYS.SUBJECT, state.subject);
    if (state.previewText !== undefined) localStorage.setItem(STORAGE_KEYS.PREVIEW_TEXT, state.previewText);
  } catch (e) {}
}

export function clearCampaignStorage() {
  try {
    const webhook = localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL) || DEFAULT_WEBHOOK_URL;
    localStorage.removeItem(STORAGE_KEYS.TEMPLATE_1_DATA);
    localStorage.removeItem(STORAGE_KEYS.TEMPLATE_2_DATA);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_RAW_HTML);
    localStorage.removeItem(STORAGE_KEYS.SUBJECT);
    localStorage.removeItem(STORAGE_KEYS.PREVIEW_TEXT);
    // Keep webhook
    localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, webhook);
  } catch (e) {}
}
