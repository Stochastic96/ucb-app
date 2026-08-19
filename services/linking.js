import { Linking, Platform } from 'react-native';

// Centralized external-link helpers. Every Linking.openURL in the app should go
// through here so the platform-compat guards live in ONE place:
//  - openURL always .catch()es (a device with no handler for tel:/mailto:/geo:
//    otherwise throws an unhandled promise rejection and crashes the screen).
//  - openInMaps hides the iOS (Apple Maps) vs Android (geo:) URL divergence.

/**
 * Open an external URL, swallowing the rejection that occurs on devices with no
 * handler for the scheme (e.g. Wi-Fi iPad with no phone/mail app).
 */
export function openExternalUrl(url) {
  if (!url) return;
  return Linking.openURL(url).catch(() => {});
}

/**
 * Open a coordinate in the device's native maps app.
 * iOS uses the Apple Maps web endpoint; Android uses the geo: intent.
 */
export function openInMaps(lat, lng, label) {
  const q = encodeURIComponent(label ?? '');
  const url = Platform.OS === 'ios'
    ? `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`
    : `geo:${lat},${lng}?q=${q}`;
  return openExternalUrl(url);
}
