import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SURFACE, BG, INACTIVE, BORDER, DARK } from '../../constants/colors';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function DataRow({ icon, title, detail }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.dataTitle}>{title}</Text>
        <Text style={styles.dataDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function RightRow({ text }) {
  return (
    <View style={styles.rightRow}>
      <Text style={styles.bullet}>·</Text>
      <Text style={styles.rightText}>{text}</Text>
    </View>
  );
}

export default function DatenschutzScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.introBanner}>
        <Text style={styles.introText}>
          Diese App speichert alle Daten ausschließlich lokal auf deinem Gerät. Es werden keine Daten an Dritte weitergegeben. Keine Werbung. Kein Tracking.
        </Text>
      </View>

      <Section title="Verarbeitete Daten">
        <DataRow
          icon="🔐"
          title="Anmeldedaten (Benutzername & Passwort)"
          detail={'Speicherort: Sicherer Systemspeicher (SecureStore)\nZweck: Authentifizierung bei Stud.IP\nÜbertragung: Ausschließlich an studip.hochschule-trier.de\nAufbewahrung: Bis zur Abmeldung'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="👤"
          title="Profildaten (Name, E-Mail, Benutzername)"
          detail={'Speicherort: Lokaler Cache auf dem Gerät\nZweck: Anzeige in der App\nAufbewahrung: Bis zu 1 Stunde, dann automatische Erneuerung'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="📚"
          title="Kursdaten, Termine & Neuigkeiten"
          detail={'Speicherort: Lokaler Cache auf dem Gerät\nZweck: Offline-Verfügbarkeit\nAufbewahrung: 15 Minuten bis 24 Stunden (je nach Datentyp)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="✅"
          title="Einstellungen & Checklisten-Fortschritt"
          detail={'Speicherort: Lokaler App-Speicher\nZweck: Nutzereinstellungen & persönlicher Fortschritt\nAufbewahrung: Bis zur Deinstallation der App'}
        />
      </Section>

      <Section title="Rechtsgrundlage">
        <Text style={styles.body}>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung / vorvertragliche Maßnahmen) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren und funktionsfähigen Bereitstellung der App).
        </Text>
      </Section>

      <Section title="Deine Rechte (Art. 15–22 DSGVO)">
        <RightRow text="Auskunft über deine gespeicherten Daten" />
        <RightRow text="Berichtigung unrichtiger Daten" />
        <RightRow text="Löschung: Einstellungen → Daten → Cache leeren, dann App deinstallieren" />
        <RightRow text="Einschränkung der Verarbeitung" />
        <RightRow text="Widerspruch gegen die Verarbeitung" />
        <RightRow text="Beschwerde bei einer Aufsichtsbehörde (z. B. LfDI Rheinland-Pfalz)" />
      </Section>

      <Section title="Keine Weitergabe an Dritte">
        <Text style={styles.body}>
          Deine Daten werden nicht an Dritte weitergegeben, verkauft oder für Werbezwecke genutzt. Die einzige externe Verbindung der App ist die Stud.IP-API der Hochschule Trier, die für den Betrieb der App notwendig ist.
        </Text>
      </Section>

      <Section title="Datenschutzbeauftragter der Hochschule">
        <Text style={styles.body}>
          Da diese App die Infrastruktur der Hochschule Trier nutzt, ist für Anfragen bzgl. der Stud.IP-Datenhaltung der Datenschutzbeauftragte der Hochschule Trier zuständig.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Web: www.hochschule-trier.de/datenschutz
        </Text>
      </Section>

      <Text style={styles.footer}>Stand: Mai 2026 · UCB App v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  introBanner: {
    margin: 16,
    backgroundColor: '#EDF6E5',
    borderColor: '#B8DDA0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  introText: { fontSize: 13, color: '#2D5A1A', lineHeight: 20, fontWeight: '500' },
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
  dataRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  dataIcon: { fontSize: 20, marginTop: 1 },
  dataTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  dataDetail: { fontSize: 13, color: '#555', lineHeight: 19 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  body: { fontSize: 14, color: '#333', lineHeight: 21 },
  rightRow: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  bullet: { fontSize: 16, color: DARK, fontWeight: '700', marginTop: -1 },
  rightText: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  footer: { textAlign: 'center', color: INACTIVE, fontSize: 12, marginTop: 28, marginBottom: 8 },
});
