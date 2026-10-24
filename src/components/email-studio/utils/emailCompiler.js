/**
 * Email Compiler: Generates 100% email-client-safe HTML using tables and inline CSS.
 * Compatible with Gmail, Outlook, Apple Mail, and Yahoo Mail.
 */

export const DEFAULT_TEMPLATE_1 = {
  // Header
  brandName: 'Acme Studio',
  logoUrl: '',
  logoWidth: 120,
  headerBg: '#FFFFFF',
  headerAlign: 'center',

  // Main Content
  headline: 'Introducing our next generation platform',
  subheadline: 'Faster automation, clean workflows, and direct email delivery.',
  body: "We're thrilled to announce the launch of our new bulk campaign workflow. Designed specifically for fast teams, you can now build, preview, and dispatch email campaigns directly through your n8n workflows with zero friction.\n\nEverything runs directly in your browser with complete privacy and instant feedback.",
  textAlign: 'left',
  fontSize: '16',
  textColor: '#334155',

  // Hero Image
  imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
  imageWidth: 100,
  imageAlign: 'center',

  // CTA Button
  hasButton: true,
  buttonText: 'Explore New Features',
  buttonUrl: 'https://example.com/announcement',
  buttonColor: '#0F172A',
  buttonTextColor: '#FFFFFF',
  buttonRadius: 6,
  buttonAlign: 'center',

  // Footer
  companyName: 'Acme Studio, Inc.',
  websiteUrl: 'https://example.com',
  footerText: 'You received this email because you are subscribed to updates.',
  contactInfo: '100 Innovation Way, San Francisco, CA 94107'
};

export const DEFAULT_TEMPLATE_2 = {
  headline: 'Service Update: Scheduled Maintenance Window',
  body: 'Hello,\n\nWe wanted to share a quick update regarding our scheduled system maintenance this weekend. On Sunday between 02:00 AM and 03:30 AM UTC, we will be rolling out minor database improvements.\n\nAll existing automated webhooks and scheduled campaigns will continue to queue and process normally without disruption.',
  signature: 'Best regards,\nThe Engineering & Operations Team'
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatParagraphs(text, fontSize = '16', textColor = '#334155', textAlign = 'left') {
  if (!text) return '';
  return text
    .split(/\n\s*\n|\n/)
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 16px 0;font-size:${fontSize}px;line-height:1.6;color:${textColor};text-align:${textAlign};">${escapeHtml(p)}</p>`)
    .join('\n');
}

export function compileEmailHtml(templateType, data, previewText = '') {
  const preheaderHtml = previewText ? `
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(previewText)}
  </div>
  ` : '';

  if (templateType === 'simple_update') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.headline || 'Email Update')}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;overflow:hidden;">
          <tr>
            <td style="padding:40px 36px;">
              ${data.headline ? `<h1 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#0F172A;line-height:1.3;">${escapeHtml(data.headline)}</h1>` : ''}
              ${formatParagraphs(data.body, '15', '#334155', 'left')}
              ${data.signature ? `
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E2E8F0;font-size:14px;line-height:1.5;color:#64748B;">
                  ${escapeHtml(data.signature).replace(/\n/g, '<br>')}
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Template 1: Custom Announcement
  const logoHtml = data.logoUrl ? `
    <img src="${data.logoUrl}" alt="${escapeHtml(data.brandName || 'Logo')}" width="${data.logoWidth || 120}" style="display:inline-block;max-width:100%;height:auto;border:0;" />
  ` : (data.brandName ? `
    <span style="font-size:18px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">${escapeHtml(data.brandName)}</span>
  ` : '');

  const heroImageHtml = data.imageUrl ? `
    <tr>
      <td align="${data.imageAlign || 'center'}" style="padding:0 36px 28px 36px;">
        <img src="${data.imageUrl}" alt="" width="${data.imageWidth ? Math.round(528 * (data.imageWidth / 100)) : 528}" style="display:inline-block;max-width:100%;border-radius:6px;border:0;" />
      </td>
    </tr>
  ` : '';

  const buttonHtml = (data.hasButton && data.buttonText) ? `
    <tr>
      <td align="${data.buttonAlign || 'center'}" style="padding:12px 36px 36px 36px;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display:inline-table;">
          <tr>
            <td align="center" style="border-radius:${data.buttonRadius || 6}px;background-color:${data.buttonColor || '#0F172A'};">
              <a href="${data.buttonUrl || '#'}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:${data.buttonTextColor || '#FFFFFF'};text-decoration:none;border-radius:${data.buttonRadius || 6}px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${escapeHtml(data.buttonText)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.headline || 'Announcement')}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">
          
          <!-- Header Area -->
          ${(logoHtml || data.brandName) ? `
          <tr>
            <td align="${data.headerAlign || 'center'}" style="padding:28px 36px;background-color:${data.headerBg || '#FFFFFF'};border-bottom:1px solid #F1F5F9;">
              ${logoHtml}
            </td>
          </tr>
          ` : ''}

          <!-- Headline & Subheadline -->
          <tr>
            <td align="${data.textAlign || 'left'}" style="padding:36px 36px 20px 36px;">
              ${data.headline ? `<h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#0F172A;line-height:1.3;text-align:${data.textAlign || 'left'};">${escapeHtml(data.headline)}</h1>` : ''}
              ${data.subheadline ? `<p style="margin:0 0 16px 0;font-size:16px;font-weight:500;color:#64748B;line-height:1.4;text-align:${data.textAlign || 'left'};">${escapeHtml(data.subheadline)}</p>` : ''}
              ${formatParagraphs(data.body, data.fontSize || '16', data.textColor || '#334155', data.textAlign || 'left')}
            </td>
          </tr>

          <!-- Hero Image -->
          ${heroImageHtml}

          <!-- CTA Button -->
          ${buttonHtml}

          <!-- Footer Area -->
          <tr>
            <td style="padding:24px 36px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.5;text-align:center;">
              ${data.companyName ? `<div style="font-weight:600;color:#334155;margin-bottom:4px;">${escapeHtml(data.companyName)}</div>` : ''}
              ${data.footerText ? `<div style="margin-bottom:4px;">${escapeHtml(data.footerText)}</div>` : ''}
              ${data.contactInfo ? `<div style="margin-bottom:4px;">${escapeHtml(data.contactInfo)}</div>` : ''}
              ${data.websiteUrl ? `<div style="margin-top:8px;"><a href="${data.websiteUrl}" target="_blank" style="color:#64748B;text-decoration:underline;">Visit Website</a></div>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
