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

export default function ImpressumScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerText}>
          Diese App ist ein inoffizielles Studentenprojekt und steht in keiner Verbindung zur Hochschule Trier oder dem Umwelt-Campus Birkenfeld.
        </Text>
      </View>

      <Section title="App-Information">
        <Row label="Name" value="UCB – Campus-Begleiter" />
        <Row label="Version" value="1.0.0 (Beta)" />
        <Row label="Art" value="Studentengeführtes Projekt" />
        <Row label="Plattform" value="iOS / Android (React Native)" />
      </Section>

      <Section title="Diensteanbieter / App-Betreiber (§ 5 DDG)">
        <Row label="Diensteanbieter" value="Studentisches Entwicklerteam „UCB App“" />
        <Row label="Vertreten durch" value="Prashant Sharma (Studentische Projektleitung)" />
        <Row label="Postanschrift" value="c/o Umwelt-Campus Birkenfeld&#10;Campusallee 9–11, Geb. 9924&#10;55768 Birkenfeld, Deutschland" />
        <Row label="E-Mail" value="ucb-app-dev@umwelt-campus.de" />
        <Row label="Rechtsform" value="Inoffizielles, studentisches Forschungsprojekt (keine juristische Person)" />
      </Section>

      <Section title="Über dieses Projekt">
        <Text style={styles.body}>
          Diese App wurde von Studierenden der Hochschule Trier entwickelt, um den Campus-Alltag für internationale Studierende zu erleichtern. Es handelt sich um ein inoffizielles, studentengeführtes Vorhaben — ohne institutionelle Unterstützung oder Haftung der Hochschule Trier.{'\n\n'}Die App dient gleichzeitig als Proof of Concept für eine nachhaltige, datensparsame Campus-App: Sie enthält keinerlei Analyse-, Tracking- oder Werbe-Code und funktioniert so weit wie möglich offline (siehe Datenschutz).
        </Text>
      </Section>

      <Section title="Hochschule / Infrastruktur-Anbieter">
        <Text style={styles.body}>
          Diese App ist ein unabhängiges studentisches Projekt. Die Hochschule Trier ist nicht Betreiber der App, stellt jedoch die Stud.IP-Infrastruktur für den Datenabruf bereit.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>Hochschule Trier — Umwelt-Campus Birkenfeld</Text>
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
