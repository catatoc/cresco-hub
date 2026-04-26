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
 */
export { m, LazyMotion, domAnimation, useReducedMotion, AnimatePresence, LayoutGroup } from 'motion/react';
