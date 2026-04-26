'use client';

/**
 * Lazy re-export of `motion/react` features for tree-shaking.
 *
 * Use `<m.div>` instead of `<motion.div>` in feature code — same API,
 * only loads the features explicitly added via LazyMotion.
 *
 * The app shell loads `domMax` (anim + drag + layout) so layoutId,
 * layout="position", and gestures all work.
 *
 * Why: pure CSS handles 80% of motion in this codebase. JS-driven motion
 * is reserved for stagger, FLIP, and particle physics. Keeping bundle
 * minimal is the contract.
 *
 * Reduced motion: CSS-driven utilities collapse automatically via the
 * @media (prefers-reduced-motion) media query in globals.css. JS-driven
 * motion is handled centrally by <MotionConfig reducedMotion="user">
 * mounted in app/(app)/layout.tsx — components don't need per-instance
 * useReducedMotion() checks for simple cases (motion will substitute
 * instant transitions when the user requests reduced motion).
 */
export { m, LazyMotion, domAnimation, domMax, MotionConfig, useReducedMotion, AnimatePresence, LayoutGroup } from 'motion/react';

/**
 * Cubic-bezier curves matching the CSS tokens in globals.css.
 *
 * `motion`'s `transition.ease` accepts a 4-tuple, not a CSS variable —
 * so JS-driven animations consume these constants instead.
 */
export const EASE_LINEAR = [0.32, 0.72, 0, 1] as const;
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;
export const EASE_OUT_SOFT = [0.4, 0, 0.2, 1] as const;
