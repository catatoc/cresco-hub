'use client';

/**
 * Lazy re-export of `motion/react/m` for tree-shaking.
 *
 * Use `<m.div>` instead of `<motion.div>` in feature code — same API,
 * only loads the features explicitly added via LazyMotion (none yet).
 *
 * Why: pure CSS handles 80% of motion in this codebase. JS-driven motion
 * is reserved for stagger, FLIP, and particle physics. Keeping bundle
 * minimal is the contract.
 *
 * Reduced motion: CSS-driven utilities collapse automatically via the
 * @media (prefers-reduced-motion) media query in globals.css. For
 * JS-driven motion props (e.g. <m.div animate={...}>), branch on
 * `useReducedMotion()` and skip the animation when it returns true.
 */
export { m, LazyMotion, domAnimation, useReducedMotion, AnimatePresence, LayoutGroup } from 'motion/react';
