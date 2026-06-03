import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SURFACE, BG, INACTIVE, DARK, BORDER } from '../../constants/colors';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function LegalScreen() {
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

      <Section title="About This Project">
        <Text style={styles.body}>
          This app was developed by students of Hochschule Trier to make campus life easier for international students. It is an unofficial, student-led initiative — without institutional support or liability from Hochschule Trier.{'\n\n'}The app also serves as a proof of concept and research project investigating the use of mobile companion apps in a university context. Anonymous usage statistics are collected (see Privacy Policy).
        </Text>
      </Section>

      <Section title="Official Institution">
        <Text style={styles.body}>Hochschule Trier</Text>
        <Text style={styles.body}>Umwelt-Campus Birkenfeld</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  disclaimerBanner: {
    margin: 16,
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD54F',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  disclaimerText: { fontSize: 13, color: '#7A5800', lineHeight: 19 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: BG,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  label: { fontSize: 14, color: INACTIVE },
  value: { fontSize: 14, fontWeight: '500', color: '#1A1A1A', textAlign: 'right', flex: 1, marginLeft: 12 },
  body: { fontSize: 14, color: '#333', lineHeight: 21 },
});
