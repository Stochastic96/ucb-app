import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';

function Section({ title, children }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function DataRow({ icon, title, detail }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.dataRow}>
      <Ionicons name={icon} size={20} color={c.brandIcon} style={styles.dataIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.dataTitle}>{title}</Text>
        <Text style={styles.dataDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function RightRow({ text }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.rightRow}>
      <Text style={styles.bullet}>·</Text>
      <Text style={styles.rightText}>{text}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.introBanner}>
        <Text style={styles.introText}>
          This app is a student-led project with no official affiliation with Hochschule Trier. Personal data (credentials, courses, timetable) is stored exclusively on your device. Campus content is loaded from Supabase — no personal data is transferred. No advertising. No personal tracking.
        </Text>
      </View>

      <Section title="Data We Process">
        <DataRow
          icon="lock-closed-outline"
          title="Login Credentials (username & password)"
          detail={'Storage: Secure system storage (SecureStore, device-specific)\nPurpose: Authentication with Stud.IP\nTransmission: Only to studip.hochschule-trier.de\nRetention: Until logout, max. 7 days (re-login required after that)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="person-outline"
          title="Profile Data (name, email, username)"
          detail={'Storage: Local cache on your device\nPurpose: Display within the app\nRetention: Up to 1 hour, then automatically renewed'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="book-outline"
          title="Course Data, Timetable & News"
          detail={'Storage: Local cache on your device\nPurpose: Offline availability\nRetention: 1–24 hours (depending on data type), until logout'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="bar-chart-outline"
          title="Anonymous Usage Statistics"
          detail={'Storage: Supabase (EU — Frankfurt), max. 90 days\nPurpose: App improvement — research project\nData: Screens viewed, features used, errors, platform (iOS/Android), app version\nSession ID: Random UUID per app start — not linked to login, device, or identity\nLegal basis: Art. 6(1)(f) GDPR (legitimate interest)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="checkmark-circle-outline"
          title="Deadlines, Exam Plans & Personal Settings"
          detail={'Storage: Local app storage (not encrypted)\nPurpose: User-created data & settings\nRetention: Until app uninstall or manual deletion (Settings → Delete All Data)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="notifications-outline"
          title="Notification Preferences"
          detail={'Storage: Local app storage\nPurpose: Schedule reminders for events, deadlines, exams & sports\nData: Notification identifiers only — no message content is sent to any server\nRetention: Until you remove the reminder or uninstall the app'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="finger-print-outline"
          title="Biometric Lock Setting"
          detail={'Storage: Local app setting only\nPurpose: Lock the app when returning from background\nData: Only the on/off preference is stored — your biometric data (fingerprint/Face ID) is processed entirely by your device\'s secure enclave and never leaves your device'}
        />
      </Section>

      <Section title="External Services (Third Parties)">
        <DataRow
          icon="globe-outline"
          title="Supabase (supabase.com)"
          detail={'Purpose: Delivery of campus content (mensa menu, events, resources)\nData: No personal data — anonymous read access to public content only\nLocation: EU (Frankfurt)\nPrivacy: supabase.com/privacy'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="trending-up-outline"
          title="Supabase — Anonymous Usage Statistics"
          detail={'Purpose: Storage of anonymous engagement events for app improvement\nData: No personal data — Session ID is not linked to any user account\nLocation: EU (Frankfurt) · Retention: 90 days\nPrivacy: supabase.com/privacy'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="phone-portrait-outline"
          title="Expo Application Services (expo.dev)"
          detail={'Purpose: App updates (OTA) and build infrastructure\nData: Technical device data for update checks (no user data)\nLocation: USA\nPrivacy: expo.dev/privacy'}
        />
      </Section>

      <Section title="Legal Basis">
        <Text style={styles.body}>
          Processing is carried out on the basis of Art. 6(1)(b) GDPR (performance of a contract / pre-contractual measures) and Art. 6(1)(f) GDPR (legitimate interest in the secure and functional provision of the app).{'\n\n'}Anonymous analytics are processed on the basis of Art. 6(1)(f) GDPR. You can disable analytics at any time in Settings → Privacy & Data.
        </Text>
      </Section>

      <Section title="Your Rights (Art. 15–22 GDPR)">
        <RightRow text="Access to your stored data" />
        <RightRow text="Correction of inaccurate data" />
        <RightRow text="Deletion: Settings → Data → 'Delete all my data', then uninstall the app" />
        <RightRow text="Restriction of processing" />
        <RightRow text="Objection to processing" />
        <RightRow text="Complaint to a supervisory authority (e.g. LfDI Rhineland-Palatinate)" />
      </Section>

      <Section title="Data Sharing">
        <Text style={styles.body}>
          Your personal data (credentials, profile, courses, timetable) is not shared with or sold to third parties. The app only connects to Hochschule Trier's Stud.IP API to retrieve your own data.{'\n\n'}Campus content (mensa menu, campus events) is provided via Supabase — no personal data is transferred in this process.
        </Text>
      </Section>

      <Section title="Data Protection Officer">
        <Text style={styles.body}>
          Since this app uses Hochschule Trier's infrastructure, enquiries regarding Stud.IP data storage should be directed to the Data Protection Officer of Hochschule Trier.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Web: www.hochschule-trier.de/datenschutz
        </Text>
      </Section>

      <Text style={styles.footer}>As of May 2026 · UCB App v1.0.0 · Student Project</Text>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  introBanner: {
    margin: 16,
    backgroundColor: c.accent,
    borderColor: c.mode === 'dark' ? c.border : '#B8DDA0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  introText: { fontSize: 13, color: c.brandIcon, lineHeight: 20, fontWeight: '500' },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: c.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  dataRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  dataIcon: { fontSize: 20, marginTop: 1 },
  dataTitle: { fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 4 },
  dataDetail: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  body: { fontSize: 14, color: c.textSecondary, lineHeight: 21 },
  rightRow: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  bullet: { fontSize: 16, color: c.brandIcon, fontWeight: '700', marginTop: -1 },
  rightText: { fontSize: 14, color: c.textSecondary, flex: 1, lineHeight: 20 },
  footer: { textAlign: 'center', color: c.textMuted, fontSize: 12, marginTop: 28, marginBottom: 8 },
});
