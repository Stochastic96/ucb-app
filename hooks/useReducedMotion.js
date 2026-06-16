import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Returns true when the OS "Reduce Motion" accessibility setting is enabled.
// Use this to skip/short-circuit entrance, looping, and press animations so the
// app honors prefers-reduced-motion (Apple Reduced Motion API / Android equivalent).
// Subscribes to live changes so toggling the setting updates the UI without a restart.
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduced(!!value); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => setReduced(!!value));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
