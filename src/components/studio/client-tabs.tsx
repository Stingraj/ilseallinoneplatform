'use client';

import { useState, type ReactNode } from 'react';

/**
 * Tabs that keep every panel mounted (inactive ones are hidden), so switching never discards unsaved work such as
 * an email being composed.
 */
export function ClientTabs({ tabs, label }: { tabs: { key: string; label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={label} className="studio-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActive(tab.key)}
            onKeyDown={(event) => {
              const index = tabs.findIndex((t) => t.key === tab.key);
              if (event.key === 'ArrowRight') setActive(tabs[(index + 1) % tabs.length].key);
              if (event.key === 'ArrowLeft') setActive(tabs[(index - 1 + tabs.length) % tabs.length].key);
            }}
            className="studio-tab"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel" id={`panel-${tab.key}`} aria-labelledby={`tab-${tab.key}`} hidden={active !== tab.key}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
