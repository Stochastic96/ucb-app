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

export default function ImpressumScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerText}>
          Diese App ist ein inoffizielles Studentenprojekt und steht in keiner Verbindung zur Hochschule Trier oder dem Umwelt-Campus Birkenfeld.
        </Text>
      </View>

      <Section title="App-Information">
        <Row label="Name" value="UCB – Campus-Begleiter" />
        <Row label="Version" value="1.0.0" />
        <Row label="Art" value="Inoffizielles Studentenprojekt" />
        <Row label="Plattform" value="iOS / Android (React Native)" />
      </Section>

      <Section title="Offizielle Institution">
        <Text style={styles.body}>Hochschule Trier</Text>
        <Text style={styles.body}>Umwelt-Campus Birkenfeld</Text>
        <Text style={styles.body}>Campusallee 9–11</Text>
        <Text style={styles.body}>55768 Birkenfeld</Text>
        <Text style={styles.body}>Deutschland</Text>
        <Text style={[styles.body, { marginTop: 8 }]}>Web: www.umwelt-campus.de</Text>
      </Section>

      <Section title="Technische Grundlage">
        <Text style={styles.body}>
          Diese App nutzt die offizielle Stud.IP JSON API v1 der Hochschule Trier zur Authentifizierung und zum Abruf von Kursdaten, Terminen und Neuigkeiten.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Stud.IP: studip.hochschule-trier.de
        </Text>
      </Section>

      <Section title="KI-Hinweis">
        <Text style={styles.body}>
          Teile dieses Projekts wurden mit Unterstützung von KI-Entwicklungstools (GitHub Copilot, Claude von Anthropic) erstellt. Die KI-Nutzung bezieht sich ausschließlich auf die Entwicklungsphase. Die App selbst enthält keine KI-Funktionen zur Laufzeit.
        </Text>
      </Section>

      <Section title="Haftungsausschluss">
        <Text style={styles.body}>
          Diese App wird ohne Gewähr bereitgestellt. Alle angezeigten Daten stammen direkt aus Stud.IP. Die Hochschule Trier ist für den Inhalt dieser App nicht verantwortlich. Für die Richtigkeit, Vollständigkeit und Aktualität der Daten übernimmt der Entwickler keine Haftung.
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
