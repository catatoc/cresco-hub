'use client';

import { useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from '@/components/motion/m';

type Props = {
  show: boolean;
};

const PARTICLES = 4;

/**
 * Renders a checkmark + confetti burst when `show` becomes true.
 * Caller controls when to flip `show` and is responsible for resetting
 * it after ~700ms (the animation duration).
 */
export function DoneCelebration({ show }: Props) {
  const reduced = useReducedMotion();
  const angles = useMemo(
    () =>
      Array.from({ length: PARTICLES }).map((_, i) => {
        const base = (i / PARTICLES) * Math.PI * 2;
        const dist = 18 + (i % 2) * 6;
        return {
          dx: Math.cos(base) * dist,
          dy: Math.sin(base) * dist,
          color: ['#3f9f5c', '#5e6ad2', '#c78a2c', '#7f3aa7'][i % 4],
        };
      }),
    [],
  );

  if (reduced) return null;

  return (
    <AnimatePresence>
      {show && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <m.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="#3f9f5c"
            strokeWidth={3}
          >
            <polyline points="20 6 9 17 4 12" />
          </m.svg>
          {angles.map((a, i) => (
            <m.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: a.dx, y: a.dy, opacity: [0, 1, 0], scale: 1 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.05 * i }}
              style={{ background: a.color }}
              className="absolute w-1 h-1 rounded-full"
            />
          ))}
        </span>
      )}
    </AnimatePresence>
  );
}
