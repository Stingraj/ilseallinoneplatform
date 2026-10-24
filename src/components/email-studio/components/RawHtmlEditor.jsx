import React from 'react';
import { Code2, Sliders, AlertCircle, RotateCcw } from 'lucide-react';

export function RawHtmlEditor({
  isHtmlMode,
  setIsHtmlMode,
  rawHtml,
  onChangeRawHtml,
  onResetToVisual,
  hasCustomHtml
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
      {/* Visual vs HTML Editor Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60">
        <button
          onClick={() => setIsHtmlMode(false)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
            !isHtmlMode
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Visual Editor</span>
        </button>

        <button
          onClick={() => setIsHtmlMode(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
            isHtmlMode
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>&lt;&gt; HTML Editor</span>
          {hasCustomHtml && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Custom HTML active" />
          )}
        </button>
      </div>

      {hasCustomHtml && (
        <button
          onClick={onResetToVisual}
          className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          title="Revert manual HTML changes and sync back with Visual Editor"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset to Visual</span>
        </button>
      )}
    </div>
  );
}
