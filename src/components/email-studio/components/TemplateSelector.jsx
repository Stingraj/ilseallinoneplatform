import React from 'react';
import { Megaphone, FileText, Check } from 'lucide-react';

export function TemplateSelector({ selectedTemplate, onSelectTemplate }) {
  const templates = [
    {
      id: 'custom_announcement',
      name: 'Custom Announcement',
      badge: 'Recommended',
      description: 'Create a branded email with your own content, image and button.',
      icon: Megaphone,
      features: ['Custom Logo', 'Hero Image', 'Call to Action Button', 'Full Header & Footer']
    },
    {
      id: 'simple_update',
      name: 'Simple Update',
      badge: 'Minimal',
      description: 'A very simple text-focused email. Clean typography for quick notes.',
      icon: FileText,
      features: ['Headline & Paragraphs', 'Optional Sign-off Signature', 'Clean Letter Style', 'Zero Distractions']
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
          Email Template
        </label>
        <span className="text-[11px] text-slate-400">2 curated email-safe layouts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((tpl) => {
          const isSelected = selectedTemplate === tpl.id;
          const Icon = tpl.icon;

          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl.id)}
              className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                isSelected
                  ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/5'
                  : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tpl.badge}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{tpl.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                </h3>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {tpl.features.map((feat, idx) => (
                  <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
