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

export default function DatenschutzScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.introBanner}>
        <Text style={styles.introText}>
          Diese App ist ein studentengeführtes Projekt und steht in keiner offiziellen Verbindung zur Hochschule Trier. Persönliche Daten (Zugangsdaten, Kurse, Termine) werden ausschließlich lokal auf deinem Gerät gespeichert. Campusinhalte werden von Supabase geladen — dabei werden keine personenbezogenen Daten übertragen. Keine Werbung. Kein personenbezogenes Tracking.
        </Text>
      </View>

      <Section title="Verarbeitete Daten">
        <DataRow
          icon="lock-closed-outline"
          title="Anmeldedaten (Benutzername & Passwort)"
          detail={'Speicherort: Sicherer Systemspeicher (SecureStore, gerätespezifisch)\nZweck: Authentifizierung bei Stud.IP\nÜbertragung: Ausschließlich an studip.hochschule-trier.de\nAufbewahrung: Bis zur Abmeldung, max. 7 Tage (danach erneuter Login erforderlich)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="person-outline"
          title="Profildaten (Name, E-Mail, Benutzername)"
          detail={'Speicherort: Lokaler Cache auf dem Gerät\nZweck: Anzeige in der App\nAufbewahrung: Bis zu 1 Stunde, dann automatische Erneuerung'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="book-outline"
          title="Kursdaten, Termine & Neuigkeiten"
          detail={'Speicherort: Lokaler Cache auf dem Gerät\nZweck: Offline-Verfügbarkeit\nAufbewahrung: 1 bis 24 Stunden (je nach Datentyp), bis zur Abmeldung'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="bar-chart-outline"
          title="Anonyme Nutzungsstatistiken"
          detail={'Speicherort: Supabase (EU – Frankfurt), max. 90 Tage\nZweck: Verbesserung der App – Forschungsprojekt\nDaten: Aufgerufene Screens, genutzte Funktionen, Fehler, Plattform (iOS/Android), App-Version\nSession-ID: Zufällige UUID pro App-Start, kein Bezug zu Login, Gerät oder Identität\nRechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="checkmark-circle-outline"
          title="Fristen, Prüfungspläne & persönliche Einstellungen"
          detail={'Speicherort: Lokaler App-Speicher (nicht verschlüsselt)\nZweck: Nutzererstellte Daten & Einstellungen\nAufbewahrung: Bis zur Deinstallation oder manuellen Löschung (Einstellungen → Alle Daten löschen)'}
        />
      </Section>

      <Section title="Externe Dienste (Drittanbieter)">
        <DataRow
          icon="globe-outline"
          title="Supabase (supabase.com)"
          detail={'Zweck: Bereitstellung von Campusinhalten (Mensaplan, Events, Ressourcen)\nDaten: Keine personenbezogenen Daten — nur anonyme Lesezugriffe auf öffentliche Inhalte\nStandort: EU (Frankfurt)\nDatenschutz: supabase.com/privacy'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="trending-up-outline"
          title="Supabase – Anonyme Nutzungsstatistiken"
          detail={'Zweck: Speicherung anonymer Engagement-Ereignisse zur App-Verbesserung\nDaten: Keine personenbezogenen Daten — Session-ID ist nicht mit einem Nutzerkonto verknüpft\nStandort: EU (Frankfurt) · Aufbewahrung: 90 Tage\nDatenschutz: supabase.com/privacy'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="phone-portrait-outline"
          title="Expo Application Services (expo.dev)"
          detail={'Zweck: App-Updates (OTA) und Build-Infrastruktur\nDaten: Technische Gerätedaten für Update-Prüfung (keine Nutzerdaten)\nStandort: USA\nDatenschutz: expo.dev/privacy'}
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
        <RightRow text="Löschung: Einstellungen → Daten → 'Alle Daten löschen', dann App deinstallieren" />
        <RightRow text="Einschränkung der Verarbeitung" />
        <RightRow text="Widerspruch gegen die Verarbeitung" />
        <RightRow text="Beschwerde bei einer Aufsichtsbehörde (z. B. LfDI Rheinland-Pfalz)" />
      </Section>

      <Section title="Datenweitergabe">
        <Text style={styles.body}>
          Deine persönlichen Daten (Zugangsdaten, Profil, Kurse, Termine) werden nicht an Dritte weitergegeben oder verkauft. Die App stellt lediglich eine Verbindung zur Stud.IP-API der Hochschule Trier her, um deine eigenen Daten abzurufen.{'\n\n'}Campusinhalte (Mensaplan, Campus-Events) werden über Supabase bereitgestellt — dabei werden keine personenbezogenen Daten übertragen.
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

      <Text style={styles.footer}>Stand: Mai 2026 · UCB App v1.0.0 · Studentenprojekt</Text>
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
