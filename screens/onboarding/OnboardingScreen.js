import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation, saveLanguage } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { useMotion } from '../../theme/MotionProvider';
import { withAlpha } from '../../constants/colors';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import useStore from '../../store/useStore';

// First-run onboarding (pre-login). Research-backed shape: max 4 swipes, value
// before sign-up, skippable at any point; the deeper "discover every tool"
// job is done AFTER login by the Getting-started checklist on Home — this flow
// only has to earn trust and orient. Zero data is collected here (or anywhere):
// the only thing persisted is the local "seen it" flag and the language choice.
const SLIDES = ['welcome', 'inside', 'trust', 'ready'];

export default function OnboardingScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { shouldAnimate } = useMotion();
  const { width } = useWindowDimensions();
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const setOnboarded = useStore((s) => s.setOnboarded);

  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, String(Date.now()));
    } catch {}
    setOnboarded(true); // RootNavigator swaps to the login screen
  };

  const next = () => {
    if (isLast) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: shouldAnimate });
  };

  const pickLanguage = async (lang) => {
    if (lang === language) return;
    await saveLanguage(lang);
    setLanguage(lang); // soft remount re-reads every t() — we are on slide 1, so no position is lost
  };

  const InsideRow = ({ icon, titleKey, bodyKey }) => (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={c.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{t(titleKey)}</Text>
        <Text style={styles.rowBody}>{t(bodyKey)}</Text>
      </View>
    </View>
  );

  const TrustRow = ({ icon, textKey }) => (
    <View style={styles.trustRow}>
      <Ionicons name={icon} size={17} color={c.primary} />
      <Text style={styles.trustText}>{t(textKey)}</Text>
    </View>
  );

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      {item === 'welcome' && (
        <View style={styles.center}>
          <View style={styles.hero}>
            <Ionicons name="leaf" size={44} color={c.primary} />
          </View>
          <Text style={styles.appName}>UCB Navigator</Text>
          <Text style={styles.tagline}>{t('onb_welcome_tagline')}</Text>
          <View style={styles.langRow}>
            {['en', 'de'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => pickLanguage(lang)}
                activeOpacity={0.85}
              >
                <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                  {lang === 'en' ? 'English' : 'Deutsch'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.disclaimer}>{t('onb_welcome_unofficial')}</Text>
        </View>
      )}

      {item === 'inside' && (
        <View style={styles.top}>
          <Text style={styles.slideTitle}>{t('onb_inside_title')}</Text>
          <Text style={styles.slideSub}>{t('onb_inside_sub')}</Text>
          <InsideRow icon="home-outline" titleKey="onb_inside_home" bodyKey="onb_inside_home_body" />
          <InsideRow icon="construct-outline" titleKey="onb_inside_tools" bodyKey="onb_inside_tools_body" />
          <InsideRow icon="book-outline" titleKey="onb_inside_guide" bodyKey="onb_inside_guide_body" />
          <InsideRow icon="map-outline" titleKey="onb_inside_map" bodyKey="onb_inside_map_body" />
        </View>
      )}

      {item === 'trust' && (
        <View style={styles.top}>
          <Text style={styles.slideTitle}>{t('onb_trust_title')}</Text>
          <Text style={styles.slideSub}>{t('onb_trust_sub')}</Text>
          <TrustRow icon="key-outline" textKey="onb_trust_login" />
          <TrustRow icon="phone-portrait-outline" textKey="onb_trust_device" />
          <TrustRow icon="eye-off-outline" textKey="onb_trust_no_tracking" />
          <TrustRow icon="cloud-offline-outline" textKey="onb_trust_offline" />
          <Text style={styles.trustFootnote}>{t('onb_trust_footnote')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Datenschutz')} hitSlop={8} style={styles.trustLink}>
            <Text style={styles.trustLinkText}>{t('onb_trust_link')}</Text>
            <Ionicons name="chevron-forward" size={14} color={c.primary} />
          </TouchableOpacity>
        </View>
      )}

      {item === 'ready' && (
        <View style={styles.center}>
          <View style={styles.hero}>
            <Ionicons name="school-outline" size={44} color={c.primary} />
          </View>
          <Text style={styles.slideTitle}>{t('onb_ready_title')}</Text>
          <Text style={[styles.slideSub, styles.centerText]}>{t('onb_ready_sub')}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ width: 44 }} />
        <View style={styles.flex} />
        {!isLast && (
          <TouchableOpacity onPress={finish} hitSlop={10}>
            <Text style={styles.skip}>{t('onb_skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextText}>{isLast ? t('onb_cta_login') : t('onb_continue')}</Text>
          <Ionicons name={isLast ? 'log-in-outline' : 'arrow-forward'} size={18} color={c.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4 },
  skip: { ...c.type.bodySm, fontFamily: c.fonts.bodySemiBold, color: c.textMuted },
  slide: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  centerText: { textAlign: 'center' },
  top: { flex: 1, paddingTop: 24 },
  hero: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: withAlpha(c.primary, '16'),
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  appName: { ...c.type.display, color: c.text, textAlign: 'center' },
  tagline: { ...c.type.body, color: c.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  langRow: { flexDirection: 'row', gap: 10, marginTop: 26 },
  langBtn: {
    paddingHorizontal: 22, height: 44, borderRadius: 999, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
  },
  langBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
  langText: { ...c.type.bodySm, fontFamily: c.fonts.bodySemiBold, color: c.textSecondary },
  langTextActive: { color: c.onPrimary },
  disclaimer: { ...c.type.caption, color: c.textFaint, textAlign: 'center', marginTop: 26, paddingHorizontal: 12 },
  slideTitle: { ...c.type.titleLg, color: c.text },
  slideSub: { ...c.type.bodySm, color: c.textSecondary, marginTop: 6, marginBottom: 20, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 14, marginBottom: 18, alignItems: 'flex-start' },
  rowIcon: {
    width: 40, height: 40, borderRadius: c.radius.md, backgroundColor: withAlpha(c.primary, '14'),
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { ...c.type.bodyStrong, color: c.text },
  rowBody: { ...c.type.bodySm, color: c.textSecondary, marginTop: 2, lineHeight: 19 },
  trustRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  trustText: { ...c.type.bodySm, color: c.text, flex: 1, lineHeight: 20 },
  trustFootnote: { ...c.type.caption, color: c.textMuted, marginTop: 10, lineHeight: 18 },
  trustLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 14 },
  trustLinkText: { ...c.type.bodySm, fontFamily: c.fonts.bodySemiBold, color: c.primary },
  footer: { paddingHorizontal: 24, paddingBottom: 36, gap: 18 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  dotActive: { backgroundColor: c.primary, width: 20 },
  nextBtn: {
    height: 52, borderRadius: c.radius.lg, backgroundColor: c.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextText: { ...c.type.bodyStrong, color: c.onPrimary },
});
