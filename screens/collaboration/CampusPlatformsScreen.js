import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { trackEvent } from '../../services/analytics';
import useStore from '../../store/useStore';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, BORDER } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

const PLATFORMS = [
  {
    id: 'mattermost',
    name: 'Mattermost',
    tagline: 'Group chat & team channels',
    url: 'https://mattermost.gitlab.rlp.net',
    iconName: 'chatbubbles-outline',
    iconColor: '#0058CC',
    iconBg: '#E8F0FB',
    tip: 'Log in with your Hochschulkennung → Create a team named after your course or project → Share the invite link with your group.',
  },
  {
    id: 'bbb',
    name: 'BigBlueButton',
    tagline: 'Join video meetings from lecturers',
    url: 'https://bbb.rlp.net',
    iconName: 'videocam-outline',
    iconColor: '#C0392B',
    iconBg: '#FDECEA',
    tip: 'Log in with your Hochschulkennung. Your lecturer shares a room link — open it here to join. Note: only staff can create new rooms.',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    tagline: 'Campus Microsoft 365 suite',
    url: 'https://www.office.com/',
    iconName: 'grid-outline',
    iconColor: '#6264A7',
    iconBg: '#EDECF8',
    tip: 'Log in with username@hochschule-trier.de or username@umwelt-campus.de. You can create teams and channels for your project group.',
  },
];

export default function CampusPlatformsScreen() {
  const t = useTranslation();
  const courses = useStore((s) => s.courses);
  const [coursesExpanded, setCoursesExpanded] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const openPlatform = async (platformId, url) => {
    trackEvent('feature_use', 'external_platform_opened', { platform: platformId });
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: PRIMARY,
      dismissButtonStyle: 'close',
    });
  };

  const copyCourse = async (name, id) => {
    await Clipboard.setStringAsync(name);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Platform cards */}
      <Text style={styles.sectionLabel}>Platforms</Text>
      {PLATFORMS.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: p.iconBg }]}>
              <Ionicons name={p.iconName} size={24} color={p.iconColor} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardName}>{p.name}</Text>
              <Text style={styles.cardTagline}>{p.tagline}</Text>
            </View>
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => openPlatform(p.id, p.url)}
              accessibilityLabel={`Open ${p.name}`}
              accessibilityRole="button"
            >
              <Text style={styles.openBtnText}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Your courses */}
      {courses.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setCoursesExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={coursesExpanded ? t('platforms_collapse_courses') : t('platforms_expand_courses')}
          >
            <Text style={styles.sectionLabel}>{t('platforms_your_courses')}</Text>
            <Ionicons
              name={coursesExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={INACTIVE}
            />
          </TouchableOpacity>

          {coursesExpanded && (
            <View style={styles.accordionBody}>
              <Text style={styles.accordionHint}>{t('platforms_copy_hint')}</Text>
              {courses.map((course) => (
                <View key={course.id} style={styles.courseRow}>
                  <Text style={styles.courseName} numberOfLines={1}>
                    {course.title ?? course.attributes?.title ?? t('platforms_unnamed_course')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyCourse(course.title ?? course.attributes?.title ?? '', course.id)}
                    hitSlop={8}
                    accessibilityLabel={t('platforms_copy_label', { title: course.title ?? '' })}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={copiedId === course.id ? 'checkmark-outline' : 'copy-outline'}
                      size={18}
                      color={copiedId === course.id ? PRIMARY : INACTIVE}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Setup tips */}
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setTipsExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={tipsExpanded ? t('platforms_collapse_tips') : t('platforms_expand_tips')}
      >
        <Text style={styles.sectionLabel}>{t('platforms_setup_tips')}</Text>
        <Ionicons
          name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={INACTIVE}
        />
      </TouchableOpacity>

      {tipsExpanded && (
        <View style={styles.accordionBody}>
          {PLATFORMS.map((p) => (
            <View key={p.id} style={styles.tipBlock}>
              <View style={styles.tipHeader}>
                <View style={[styles.tipDot, { backgroundColor: p.iconColor }]} />
                <Text style={styles.tipTitle}>{p.name}</Text>
              </View>
              <Text style={styles.tipText}>{p.tip}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: BG,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  cardTagline: { fontSize: 13, color: INACTIVE, marginTop: 2 },
  openBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  accordionBody: {
    backgroundColor: BG,
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  accordionHint: { fontSize: 13, color: INACTIVE, marginBottom: 10 },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  courseName: { flex: 1, fontSize: 14, color: '#1A1A1A', marginRight: 12 },
  tipBlock: { marginBottom: 14 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tipDot: { width: 8, height: 8, borderRadius: 4 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  tipText: { fontSize: 13, color: '#555', lineHeight: 19, paddingLeft: 16 },
});
