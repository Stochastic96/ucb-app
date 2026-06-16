import React, { useRef, useState, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store/useStore';
import { trackScreen } from '../../services/analytics';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n';

// react-native-webview is not bundled in Expo Go — graceful fallback below
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {}

const MENSA_URL = 'https://mensa.campus-company.eu/';

export default function MensaScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const webViewRef = useRef(null);
  const openSidebar = useStore((s) => s.openSidebar);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => { trackScreen('MensaScreen'); }, []);
  const [loadError, setLoadError] = useState(false);
  const [progress, setProgress] = useState(0);

  // Always call hooks unconditionally — WebView availability checked in render
  useLayoutEffect(() => {
    if (!WebView) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => { setLoadError(false); setLoading(true); webViewRef.current?.reload(); }}
            hitSlop={12}
            accessibilityLabel={t('mensa_reload')}
          >
            <Ionicons name="refresh" size={22} color={c.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 4 }}>
            <Ionicons name="menu" size={24} color={c.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, openSidebar]);

  // Expo Go fallback — WebView native module not available
  if (!WebView) {
    return (
      <View style={styles.expoGoFallback}>
        <Ionicons name="restaurant-outline" size={56} color={c.border} />
        <Text style={styles.errorTitle}>{t('screen_mensa')}</Text>
        <Text style={styles.errorSub}>{t('mensa_expo_go_msg')}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => Linking.openURL(MENSA_URL).catch(() => {})}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={17} color={c.onPrimary} />
          <Text style={styles.retryText}>{t('mensa_open_website')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar — shown while page is loading */}
      {loading && !loadError && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: MENSA_URL }}
        style={styles.webview}
        onLoadStart={() => { setLoading(true); setLoadError(false); }}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        onError={() => { setLoading(false); setLoadError(true); }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 400) {
            setLoading(false);
            setLoadError(true);
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mixedContentMode="never"
        // Mobile UA so the site renders its responsive layout
        userAgent="Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
      />

      {/* Loading overlay — sits above WebView until first paint */}
      {loading && !loadError && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={styles.loadingText}>{t('mensa_loading')}</Text>
        </View>
      )}

      {/* Error state */}
      {loadError && (
        <View style={styles.errorOverlay}>
          <Ionicons name="restaurant-outline" size={52} color={c.border} />
          <Text style={styles.errorTitle}>{t('mensa_error_title')}</Text>
          <Text style={styles.errorSub}>{t('mensa_error_msg')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoadError(false); setLoading(true); webViewRef.current?.reload(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={17} color={c.onPrimary} />
            <Text style={styles.retryText}>{t('common_retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openExternalBtn}
            onPress={() => Linking.openURL(MENSA_URL).catch(() => {})}
            activeOpacity={0.7}
          >
            <Text style={styles.openExternalText}>{t('mensa_open_browser')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  progressTrack: {
    height: 3,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: c.primary,
  },

  webview: { flex: 1 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: c.textMuted,
  },

  expoGoFallback: {
    flex: 1,
    backgroundColor: c.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
    marginTop: 8,
  },
  errorSub: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: c.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: c.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  openExternalBtn: {
    marginTop: 8,
    paddingVertical: 8,
  },
  openExternalText: {
    fontSize: 14,
    color: c.brandIcon,
    fontWeight: '600',
  },
});
