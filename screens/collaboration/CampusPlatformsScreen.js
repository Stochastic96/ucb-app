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
import useStore from '../../store/useStore';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { platformIconColor } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

const PLATFORMS = [
  {
    id: 'mattermost',
    name: 'Mattermost',
    tagline: 'Group chat & team channels',
    url: 'https://mattermost.gitlab.rlp.net',
    iconName: 'chatbubbles-outline',
    tip: 'Log in with your Hochschulkennung → Create a team named after your course or project → Share the invite link with your group.',
  },
  {
    id: 'bbb',
    name: 'BigBlueButton',
    tagline: 'Join video meetings from lecturers',
    url: 'https://bbb.rlp.net',
    iconName: 'videocam-outline',
    tip: 'Log in with your Hochschulkennung. Your lecturer shares a room link — open it here to join. Note: only staff can create new rooms.',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    tagline: 'Campus Microsoft 365 suite',
    url: 'https://www.office.com/',
    iconName: 'grid-outline',
    tip: 'Log in with username@hochschule-trier.de or username@umwelt-campus.de. You can create teams and channels for your project group.',
  },
];

export default function CampusPlatformsScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const courses = useStore((s) => s.courses);
  const [coursesExpanded, setCoursesExpanded] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const openPlatform = async (platformId, url) => {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: c.primary,
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
            <View style={[styles.iconBox, { backgroundColor: platformIconColor(p.id, c.mode).bg }]}>
              <Ionicons name={p.iconName} size={24} color={platformIconColor(p.id, c.mode).icon} />
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
              color={c.textMuted}
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
                      color={copiedId === course.id ? c.primary : c.textMuted}
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
          color={c.textMuted}
        />
      </TouchableOpacity>

      {tipsExpanded && (
        <View style={styles.accordionBody}>
          {PLATFORMS.map((p) => (
            <View key={p.id} style={styles.tipBlock}>
              <View style={styles.tipHeader}>
                <View style={[styles.tipDot, { backgroundColor: platformIconColor(p.id, c.mode).icon }]} />
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

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 40 },
  sectionLabel: {
    ...c.type.micro,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: c.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: c.radius.lg,
    padding: 14,
    ...c.shadows.card,
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
  cardName: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text },
  cardTagline: { ...c.type.bodySm, color: c.textMuted, marginTop: 2 },
  openBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openBtnText: { ...c.type.label, fontSize: 14, color: c.onPrimary },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  accordionBody: {
    backgroundColor: c.surface,
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  accordionHint: { ...c.type.bodySm, color: c.textMuted, marginBottom: 10 },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  courseName: { ...c.type.bodySm, fontSize: 14, flex: 1, color: c.text, marginRight: 12 },
  tipBlock: { marginBottom: 14 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tipDot: { width: 8, height: 8, borderRadius: 4 },
  tipTitle: { ...c.type.bodyStrong, fontSize: 14, color: c.text },
  tipText: { ...c.type.bodySm, color: c.textSecondary, paddingLeft: 16 },
});
