import React, { useRef } from 'react';
import { Upload, X, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Link as LinkIcon, Type } from 'lucide-react';

export function EmailEditor({
  templateType,
  template1Data,
  template2Data,
  onChangeTemplate1,
  onChangeTemplate2
}) {
  const logoInputRef = useRef(null);
  const heroImageInputRef = useRef(null);

  // File to Base64 helper
  const handleFileUpload = (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: e.g. 2MB to keep payload reasonable for Gmail
    if (file.size > 2 * 1024 * 1024) {
      alert('Image exceeds 2MB. Please choose a smaller image for email client compatibility.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      callback(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  if (templateType === 'simple_update') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
          <input
            type="text"
            value={template2Data.headline}
            onChange={(e) => onChangeTemplate2({ ...template2Data, headline: e.target.value })}
            placeholder="e.g. Scheduled Service Maintenance"
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
          <textarea
            value={template2Data.body}
            onChange={(e) => onChangeTemplate2({ ...template2Data, body: e.target.value })}
            placeholder="Write your email body copy here..."
            rows={7}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Sign-off / Signature</label>
          <textarea
            value={template2Data.signature}
            onChange={(e) => onChangeTemplate2({ ...template2Data, signature: e.target.value })}
            placeholder="e.g. Best regards,&#10;The Team"
            rows={3}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white resize-y"
          />
        </div>
      </div>
    );
  }

  // Template 1: Custom Announcement
  return (
    <div className="space-y-6">
      
      {/* 1. Header Settings */}
      <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>1. Header & Branding</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Brand Name</label>
            <input
              type="text"
              value={template1Data.brandName}
              onChange={(e) => onChangeTemplate1({ ...template1Data, brandName: e.target.value })}
              placeholder="e.g. Acme Studio"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Header Background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={template1Data.headerBg || '#FFFFFF'}
                onChange={(e) => onChangeTemplate1({ ...template1Data, headerBg: e.target.value })}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-600">{template1Data.headerBg || '#FFFFFF'}</span>
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Brand Logo (Optional)</label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, (base64) => onChangeTemplate1({ ...template1Data, logoUrl: base64 }))}
            className="hidden"
          />
          {template1Data.logoUrl ? (
            <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <img src={template1Data.logoUrl} alt="Logo" className="h-7 max-w-[100px] object-contain rounded" />
                <span className="text-[11px] text-slate-500">Logo loaded (base64)</span>
              </div>
              <button
                onClick={() => onChangeTemplate1({ ...template1Data, logoUrl: '' })}
                className="p-1 text-slate-400 hover:text-red-600 rounded"
                title="Remove logo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-xs text-slate-600 bg-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Brand Logo (PNG / JPG)</span>
            </button>
          )}
        </div>

        {template1Data.logoUrl && (
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-[11px] text-slate-500">Logo Width: {template1Data.logoWidth || 120}px</span>
            <input
              type="range"
              min={60}
              max={240}
              value={template1Data.logoWidth || 120}
              onChange={(e) => onChangeTemplate1({ ...template1Data, logoWidth: parseInt(e.target.value, 10) })}
              className="w-32"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">Header Alignment</span>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                onClick={() => onChangeTemplate1({ ...template1Data, headerAlign: align })}
                className={`p-1 rounded ${template1Data.headerAlign === align ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Content */}
      <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>2. Main Content</span>
        </h4>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Headline</label>
          <input
            type="text"
            value={template1Data.headline}
            onChange={(e) => onChangeTemplate1({ ...template1Data, headline: e.target.value })}
            placeholder="e.g. Big announcement"
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Subheadline (Optional)</label>
          <input
            type="text"
            value={template1Data.subheadline}
            onChange={(e) => onChangeTemplate1({ ...template1Data, subheadline: e.target.value })}
            placeholder="e.g. Highlights & feature updates"
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Body Text</label>
          <textarea
            value={template1Data.body}
            onChange={(e) => onChangeTemplate1({ ...template1Data, body: e.target.value })}
            placeholder="We're excited to share..."
            rows={5}
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">Text Alignment</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              {['left', 'center'].map((align) => (
                <button
                  key={align}
                  onClick={() => onChangeTemplate1({ ...template1Data, textAlign: align })}
                  className={`flex-1 py-1 rounded text-center text-xs capitalize ${template1Data.textAlign === align ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">Font Size</span>
            <select
              value={template1Data.fontSize || '16'}
              onChange={(e) => onChangeTemplate1({ ...template1Data, fontSize: e.target.value })}
              className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
            >
              <option value="14">Compact (14px)</option>
              <option value="16">Standard (16px)</option>
              <option value="18">Comfortable (18px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Hero Image */}
      <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
          <span>3. Hero Image (Optional)</span>
          {template1Data.imageUrl && (
            <button
              onClick={() => onChangeTemplate1({ ...template1Data, imageUrl: '' })}
              className="text-[11px] text-red-600 hover:underline font-normal"
            >
              Remove
            </button>
          )}
        </h4>

        <input
          ref={heroImageInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, (base64) => onChangeTemplate1({ ...template1Data, imageUrl: base64 }))}
          className="hidden"
        />

        {template1Data.imageUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center">
              <img src={template1Data.imageUrl} alt="Hero preview" className="w-full h-auto object-cover max-h-48" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500">Image Width: {template1Data.imageWidth || 100}%</span>
              <input
                type="range"
                min={50}
                max={100}
                value={template1Data.imageWidth || 100}
                onChange={(e) => onChangeTemplate1({ ...template1Data, imageWidth: parseInt(e.target.value, 10) })}
                className="w-32"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => heroImageInputRef.current?.click()}
            className="w-full py-4 px-3 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-600 bg-white flex flex-col items-center justify-center gap-1.5 transition-colors"
          >
            <ImageIcon className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Upload Hero Banner Image</span>
            <span className="text-[10px] text-slate-400">Converted automatically to embedded Base64</span>
          </button>
        )}
      </div>

      {/* 4. Call to Action Button */}
      <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            <span>4. Call-to-Action Button</span>
          </h4>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={template1Data.hasButton !== false}
              onChange={(e) => onChangeTemplate1({ ...template1Data, hasButton: e.target.checked })}
              className="rounded text-slate-900 focus:ring-slate-900/20"
            />
            <span>Enable Button</span>
          </label>
        </div>

        {template1Data.hasButton !== false && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Button Text</label>
                <input
                  type="text"
                  value={template1Data.buttonText}
                  onChange={(e) => onChangeTemplate1({ ...template1Data, buttonText: e.target.value })}
                  placeholder="e.g. Learn More"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Button Destination URL</label>
                <input
                  type="url"
                  value={template1Data.buttonUrl}
                  onChange={(e) => onChangeTemplate1({ ...template1Data, buttonUrl: e.target.value })}
                  placeholder="https://example.com/..."
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Button Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={template1Data.buttonColor || '#0F172A'}
                    onChange={(e) => onChangeTemplate1({ ...template1Data, buttonColor: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono">{template1Data.buttonColor || '#0F172A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Text Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={template1Data.buttonTextColor || '#FFFFFF'}
                    onChange={(e) => onChangeTemplate1({ ...template1Data, buttonTextColor: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono">{template1Data.buttonTextColor || '#FFFFFF'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Corner Radius</label>
                <select
                  value={template1Data.buttonRadius || 6}
                  onChange={(e) => onChangeTemplate1({ ...template1Data, buttonRadius: parseInt(e.target.value, 10) })}
                  className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="0">Sharp (0px)</option>
                  <option value="4">Subtle (4px)</option>
                  <option value="6">Rounded (6px)</option>
                  <option value="12">Pill (12px)</option>
                  <option value="9999">Full (Pill)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer Details */}
      <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          <span>5. Footer Details</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Company Name</label>
            <input
              type="text"
              value={template1Data.companyName}
              onChange={(e) => onChangeTemplate1({ ...template1Data, companyName: e.target.value })}
              placeholder="e.g. Acme Studio, Inc."
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Website URL</label>
            <input
              type="url"
              value={template1Data.websiteUrl}
              onChange={(e) => onChangeTemplate1({ ...template1Data, websiteUrl: e.target.value })}
              placeholder="https://..."
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Footer Note / Unsubscribe Info</label>
          <input
            type="text"
            value={template1Data.footerText}
            onChange={(e) => onChangeTemplate1({ ...template1Data, footerText: e.target.value })}
            placeholder="e.g. You received this email because you subscribed to updates."
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
          />
        </div>
      </div>

    </div>
  );
}
