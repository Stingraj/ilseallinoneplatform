'use client';

import { useEffect } from 'react';

/** Anonymous view count: no cookies, no identifiers. Skipped when the browser asks not to be tracked. */
export function TrackView({ event, artworkId }: { event: 'page_view' | 'artwork_view' | 'viewing_room_open'; artworkId?: string }) {
  useEffect(() => {
    if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const body = JSON.stringify({ event, path: window.location.pathname, artworkId });
    navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }));
  }, [event, artworkId]);
  return null;
}
