'use client';

import { useEffect, useRef } from 'react';

/** Hidden spam guards: a honeypot field people never see, and the time the form was first shown. */
export function FormGuards() {
  const startedAt = useRef<HTMLInputElement>(null);
  // Set after hydration so the time is the visitor's, not the server render's.
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);
  return (
    <>
      <input ref={startedAt} type="hidden" name="startedAt" defaultValue="" />
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}
