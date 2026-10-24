export type Tier = 'high' | 'medium' | 'low' | 'none';

export interface Capability {
  tier: Tier;
  webgl: boolean;
  reducedMotion: boolean;
  touch: boolean;
  /** Why the 3D view is not offered by default, shown to the visitor. */
  reason: string | null;
}

/** Decides how much 3D this device should be offered. Pure so it can be tested with fake inputs. */
export function classify(input: {
  webgl: boolean;
  memoryGb?: number;
  cores?: number;
  width: number;
  touch: boolean;
  saveData?: boolean;
  reducedMotion: boolean;
}): Capability {
  const base = { webgl: input.webgl, reducedMotion: input.reducedMotion, touch: input.touch };
  if (!input.webgl) return { ...base, tier: 'none', reason: 'Your browser cannot show 3D graphics.' };
  if (input.saveData) return { ...base, tier: 'low', reason: 'Data saver is on, so the 3D gallery is not loaded automatically.' };

  const memory = input.memoryGb ?? (input.touch ? 4 : 8);
  const cores = input.cores ?? 4;
  if (memory <= 2 || cores <= 2) return { ...base, tier: 'low', reason: 'This device may be too slow for the 3D gallery.' };
  if (input.touch && input.width < 820) return { ...base, tier: 'medium', reason: null };
  if (memory >= 8 && cores >= 6 && !input.touch) return { ...base, tier: 'high', reason: null };
  return { ...base, tier: 'medium', reason: null };
}

export function detectCapability(): Capability {
  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webgl = false;
  }
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return classify({
    webgl,
    memoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    width: window.innerWidth,
    touch: window.matchMedia('(pointer: coarse)').matches,
    saveData: nav.connection?.saveData,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
}
