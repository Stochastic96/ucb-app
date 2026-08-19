import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemedStyles } from '../../theme/ThemeProvider';

function Section({ title, children }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function LegalScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerText}>
          This app is an unofficial student project with no affiliation with Hochschule Trier or Umwelt-Campus Birkenfeld.
        </Text>
      </View>

      <Section title="App Information">
        <Row label="Name" value="UCB – Campus Companion" />
        <Row label="Version" value="1.0.0 (Beta)" />
        <Row label="Type" value="Student-led project" />
        <Row label="Platform" value="iOS / Android (React Native)" />
      </Section>

      <Section title="Service Provider / App Operator (§ 5 DDG)">
        <Row label="Service Provider" value="Student Development Team &quot;UCB App&quot;" />
        <Row label="Represented by" value="Prashant Sharma (Student Project Lead)" />
        <Row label="Postal Address" value="c/o Umwelt-Campus Birkenfeld&#10;Campusallee 9–11, Geb. 9924&#10;55768 Birkenfeld, Germany" />
        <Row label="Email" value="ucb-app-dev@umwelt-campus.de" />
        <Row label="Legal Form" value="Unofficial student research project (no corporate entity)" />
      </Section>

      <Section title="About This Project">
        <Text style={styles.body}>
          This app was developed by students of Hochschule Trier to make campus life easier for international students. It is an unofficial, student-led initiative — without institutional support or liability from Hochschule Trier.{'\n\n'}The app also serves as a proof of concept for a sustainable, privacy-friendly campus app: It contains no analytics, tracking or advertising code of any kind and works offline as far as possible (see Privacy Policy).
        </Text>
      </Section>

      <Section title="University / Infrastructure Host">
        <Text style={styles.body}>
          This app is an independent student project. Hochschule Trier is not the operator of the app, but provides the Stud.IP infrastructure for data access.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>Hochschule Trier — Umwelt-Campus Birkenfeld</Text>
        <Text style={styles.body}>Campusallee 9–11</Text>
        <Text style={styles.body}>55768 Birkenfeld</Text>
        <Text style={styles.body}>Germany</Text>
        <Text style={[styles.body, { marginTop: 8 }]}>Web: www.umwelt-campus.de</Text>
      </Section>

      <Section title="Technical Basis">
        <Text style={styles.body}>
          This app uses the official Stud.IP JSON API v1 of Hochschule Trier for authentication and retrieval of course data, timetable events, and news.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Stud.IP: studip.hochschule-trier.de
        </Text>
      </Section>

      <Section title="AI Disclosure">
        <Text style={styles.body}>
          Parts of this project were created with the assistance of AI development tools (GitHub Copilot, Claude by Anthropic). AI use relates exclusively to the development phase. The app itself contains no AI features at runtime.
        </Text>
      </Section>

      <Section title="Disclaimer">
        <Text style={styles.body}>
          This app is provided without warranty of any kind. All data displayed is sourced directly from Stud.IP. Hochschule Trier is not responsible for the content of this app. The developer assumes no liability for the accuracy, completeness, or timeliness of the data.
        </Text>
      </Section>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  disclaimerBanner: {
    margin: 16,
    backgroundColor: c.warningSurface,
    borderColor: c.warningBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  disclaimerText: { ...c.type.bodySm, color: c.onWarning },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  label: { ...c.type.bodySm, fontSize: 14, color: c.textMuted },
  value: { ...c.type.bodySm, fontSize: 14, fontFamily: c.fonts.bodyMedium, color: c.text, textAlign: 'right', flex: 1, marginLeft: 12 },
  body: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, lineHeight: 21 },
});
