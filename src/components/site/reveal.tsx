'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Fades content up as it enters the viewport. Content is visible without JavaScript and with reduced motion. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight) return; // already on screen: never hide it
    setState('hidden');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-1000 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        state === 'hidden' && 'translate-y-6 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
