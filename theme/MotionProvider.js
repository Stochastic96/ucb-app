import React, { createContext, useContext, useMemo } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';

// App-wide motion policy. Reads the OS "Reduce Motion" accessibility setting once
// (via useReducedMotion) and exposes it to every animated component so they can
// honor prefers-reduced-motion centrally (BITV 2.0 / EN 301 549) instead of each
// component re-subscribing. Engine-agnostic on purpose: the config objects are
// plain numbers usable by both React Native's built-in Animated API and (once
// installed) Reanimated's withSpring/withTiming — no native dependency here.
//
// Usage:
//   const { shouldAnimate, spring, timing, stagger } = useMotion();
//   if (!shouldAnimate) { /* snap to final state */ }
//   withSpring(target, spring)            // Reanimated
//   Animated.timing(v, { ...timing })     // built-in Animated

const BASE_SPRING = { damping: 18, stiffness: 200, mass: 1 };
const BASE_DURATION = 260;
const BASE_STAGGER = 80; // ms between staggered list/grid item entrances

const defaultMotion = {
  shouldAnimate: true,
  spring: BASE_SPRING,
  timing: { duration: BASE_DURATION },
  stagger: BASE_STAGGER,
};

const MotionContext = createContext(defaultMotion);

export function MotionProvider({ children }) {
  const reduced = useReducedMotion();
  const value = useMemo(
    () => ({
      shouldAnimate: !reduced,
      spring: BASE_SPRING,
      // When Reduce Motion is on, collapse durations/stagger to 0 so transitions
      // are instant rather than removed — layout stays correct, motion is gone.
      timing: { duration: reduced ? 0 : BASE_DURATION },
      stagger: reduced ? 0 : BASE_STAGGER,
    }),
    [reduced]
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

// Returns the active motion policy { shouldAnimate, spring, timing, stagger }.
export function useMotion() {
  return useContext(MotionContext);
}
