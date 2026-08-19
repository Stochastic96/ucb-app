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
  const c = useTheme();
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
          title="Usage Statistics / Tracking"
          detail={'There are none. The app contains no analytics, tracking or advertising code of any kind. What features you use is not recorded — neither anonymously nor pseudonymously.'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="checkmark-circle-outline"
          title="Deadlines, Exam Plans & Personal Settings"
          detail={'Storage: Local app storage (not encrypted)\nPurpose: User-created data & settings\nRetention: Until app uninstall or manual deletion (Settings → Delete All Data)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="bluetooth-outline"
          title="Campus Radar (Bluetooth Socializing)"
          detail={'Storage: Self-created profile (nickname, status, interests, DE/INT, optional degree program/semester/languages, optional real name) locally on your device\nNickname: Freely selectable, no real name — never imported from Stud.IP\nDegree Program/Semester/Languages: Voluntary self-disclosures (not imported or verified from Stud.IP); broadcast as part of your presence card via Bluetooth to nearby devices\nReal Name: NEVER broadcast — only sent encrypted to an individual chat upon explicit tap ("Share my name")\nVisibility: Starts in Ghost mode (hidden); visibility controllable by you at any time\nTransmission: Exclusively direct via Bluetooth to nearby devices — no server, no account, no cloud\nIdentity: Anonymous, device-generated Ed25519 keypair — not linked to Stud.IP\nSecurity: Messages signed; direct messages end-to-end encrypted (Noise protocol); interests sent only as pairwise encrypted tokens (no plaintext over the radio channel)\nModeration: No central moderation — block/report operates locally on your device; for harassment contact campus security/police\nMessages: Session only, not stored permanently\nLocation Permission (Android): Technically required for Bluetooth scans — GPS position is not read, stored, or transmitted\nLegal basis: Art. 6(1)(a) GDPR (consent, revocable at any time by toggling off)'}
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
          icon="phone-portrait-outline"
          title="Expo Application Services (expo.dev)"
          detail={'Purpose: App updates (OTA) and build infrastructure\nData: Technical device data for update checks (no user data)\nLocation: USA\nPrivacy: expo.dev/privacy'}
        />
      </Section>

      <Section title="Data Controller (Art. 13(1)(a) GDPR)">
        <Text style={styles.body}>
          The controller responsible for data processing within this app is:
        </Text>
        <Text style={[styles.body, { fontFamily: c.fonts.bodyBold, marginTop: 6 }]}>
          Prashant Sharma (Student Project Lead, UCB App)
        </Text>
        <Text style={styles.body}>c/o Umwelt-Campus Birkenfeld</Text>
        <Text style={styles.body}>Campusallee 9–11, Geb. 9924</Text>
        <Text style={styles.body}>55768 Birkenfeld, Germany</Text>
        <Text style={[styles.body, { marginTop: 6 }]}>
          Contact / GDPR Rights: ucb-app-dev@umwelt-campus.de
        </Text>
      </Section>

      <Section title="Legal Basis">
        <Text style={styles.body}>
          Processing is carried out on the basis of Art. 6(1)(b) GDPR (performance of a contract / pre-contractual measures) and Art. 6(1)(f) GDPR (legitimate interest in the secure and functional provision of the app).{'\n\n'}This app contains no analytics, tracking or advertising code of any kind. Your usage of the app is not recorded — neither anonymously nor pseudonymously.
        </Text>
      </Section>

      <Section title="Your Rights (Art. 15–22 GDPR)">
        <RightRow text="Access to your stored data (Art. 15 GDPR)" />
        <RightRow text="Correction of inaccurate data (Art. 16 GDPR)" />
        <RightRow text="Deletion: Settings → Data → 'Delete all my data', then uninstall the app (Art. 17 GDPR)" />
        <RightRow text="Restriction of processing (Art. 18 GDPR)" />
        <RightRow text="Objection to processing (Art. 21 GDPR)" />
        <RightRow text="To exercise any of these rights, contact ucb-app-dev@umwelt-campus.de" />
        <RightRow text="Complaint to a supervisory authority (e.g. LfDI Rhineland-Palatinate)" />
      </Section>

      <Section title="Data Sharing">
        <Text style={styles.body}>
          Your personal data (credentials, profile, courses, timetable) is not shared with or sold to third parties. The app only connects to Hochschule Trier's Stud.IP API to retrieve your own data.{'\n\n'}Campus content (mensa menu, campus events) is provided via Supabase — no personal data is transferred in this process.
        </Text>
      </Section>

      <Section title="Data Protection Officer of the University">
        <Text style={styles.body}>
          Since this app accesses Hochschule Trier's Stud.IP infrastructure, enquiries regarding institutional Stud.IP data storage may also be directed to the Data Protection Officer of Hochschule Trier.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Web: www.hochschule-trier.de/datenschutz
        </Text>
      </Section>

      <Text style={styles.footer}>As of July 2026 · UCB App v1.0.0 · Student Project</Text>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  introBanner: {
    margin: 16,
    backgroundColor: c.accent,
    borderColor: c.mode === 'dark' ? c.border : '#B8DDA0', // light green tint pairs with accent surface
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  introText: { ...c.type.bodySm, fontFamily: c.fonts.bodyMedium, color: c.brandIcon },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    ...c.type.micro,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: c.radius.md,
    padding: 14,
    ...c.shadows.card,
  },
  dataRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  dataIcon: { fontSize: 20, marginTop: 1 },
  dataTitle: { ...c.type.bodyStrong, fontSize: 14, color: c.text, marginBottom: 4 },
  dataDetail: { ...c.type.bodySm, color: c.textSecondary },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  body: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, lineHeight: 21 },
  rightRow: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  bullet: { ...c.type.heading, fontFamily: c.fonts.bodyBold, color: c.brandIcon, marginTop: -1 },
  rightText: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, flex: 1 },
  footer: { ...c.type.caption, textAlign: 'center', color: c.textMuted, marginTop: 28, marginBottom: 8 },
});
