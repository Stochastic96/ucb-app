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
  const c = useTheme();
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
          title="Nutzungsstatistiken / Tracking"
          detail={'Es gibt keine. Die App enthält keinerlei Analyse-, Tracking- oder Werbe-Code. Es wird nicht erfasst, welche Funktionen du nutzt — weder anonym noch pseudonym.'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="checkmark-circle-outline"
          title="Fristen, Prüfungspläne & persönliche Einstellungen"
          detail={'Speicherort: Lokaler App-Speicher (nicht verschlüsselt)\nZweck: Nutzererstellte Daten & Einstellungen\nAufbewahrung: Bis zur Deinstallation oder manuellen Löschung (Einstellungen → Alle Daten löschen)'}
        />
        <View style={styles.divider} />
        <DataRow
          icon="bluetooth-outline"
          title="Campus-Radar (Bluetooth-Socializing)"
          detail={'Speicherort: Selbst erstelltes Profil (Spitzname, Status, Interessen, DE/INT, optional Studiengang/Semester/Sprachen, optional echter Name) lokal auf dem Gerät\nSpitzname: Frei wählbar, kein Klarname — wird nie aus Stud.IP übernommen\nStudiengang/Semester/Sprachen: Freiwillige Selbstangaben (nicht aus Stud.IP übernommen oder geprüft); werden als Teil deiner Präsenzkarte per Bluetooth an Geräte in der Nähe gesendet\nEchter Name: Wird NIE per Rundruf gesendet — nur auf ausdrückliches Antippen („Meinen Namen teilen“) verschlüsselt in einen einzelnen Chat übertragen\nSichtbarkeit: Start im Ghost-Modus (verborgen); Sichtbarkeit jederzeit selbst steuerbar\nÜbertragung: Ausschließlich direkt per Bluetooth an Geräte in der Nähe — kein Server, kein Konto, keine Cloud\nIdentität: Anonymes, auf dem Gerät erzeugtes Ed25519-Schlüsselpaar — nicht mit Stud.IP verknüpft\nSicherheit: Nachrichten signiert; Direktnachrichten Ende-zu-Ende verschlüsselt (Noise-Protokoll); Interessen nur als paarweise verschlüsselte Tokens gesendet (kein Klartext auf dem Funkkanal)\nModeration: Keine zentrale Moderation — Blockieren/Melden wirkt lokal auf deinem Gerät; bei Belästigung an Campus-Sicherheit/Polizei wenden\nNachrichten: Nur während der Sitzung, nicht dauerhaft gespeichert\nStandortberechtigung (Android): Für Bluetooth-Scans technisch vorgeschrieben — die GPS-Position wird nicht ausgelesen, nicht gespeichert und nicht übertragen\nRechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, jederzeit widerrufbar durch Ausschalten)'}
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
          icon="phone-portrait-outline"
          title="Expo Application Services (expo.dev)"
          detail={'Zweck: App-Updates (OTA) und Build-Infrastruktur\nDaten: Technische Gerätedaten für Update-Prüfung (keine Nutzerdaten)\nStandort: USA\nDatenschutz: expo.dev/privacy'}
        />
      </Section>

      <Section title="Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)">
        <Text style={styles.body}>
          Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) für die Datenverarbeitung innerhalb dieser App ist:
        </Text>
        <Text style={[styles.body, { fontFamily: c.fonts.bodyBold, marginTop: 6 }]}>
          Prashant Sharma (Studentische Projektleitung, UCB App)
        </Text>
        <Text style={styles.body}>c/o Umwelt-Campus Birkenfeld</Text>
        <Text style={styles.body}>Campusallee 9–11, Geb. 9924</Text>
        <Text style={styles.body}>55768 Birkenfeld, Deutschland</Text>
        <Text style={[styles.body, { marginTop: 6 }]}>
          Kontakt / Datenschutzanfragen: ucb-app-dev@umwelt-campus.de
        </Text>
      </Section>

      <Section title="Rechtsgrundlage">
        <Text style={styles.body}>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung / vorvertragliche Maßnahmen) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren und funktionsfähigen Bereitstellung der App).
        </Text>
      </Section>

      <Section title="Deine Rechte (Art. 15–22 DSGVO)">
        <RightRow text="Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)" />
        <RightRow text="Berichtigung unrichtiger Daten (Art. 16 DSGVO)" />
        <RightRow text="Löschung: Einstellungen → Daten → 'Alle Daten löschen', dann App deinstallieren (Art. 17 DSGVO)" />
        <RightRow text="Einschränkung der Verarbeitung (Art. 18 DSGVO)" />
        <RightRow text="Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)" />
        <RightRow text="Zur Ausübung dieser Rechte wende dich an ucb-app-dev@umwelt-campus.de" />
        <RightRow text="Beschwerde bei einer Aufsichtsbehörde (z. B. LfDI Rheinland-Pfalz)" />
      </Section>

      <Section title="Datenweitergabe">
        <Text style={styles.body}>
          Deine persönlichen Daten (Zugangsdaten, Profil, Kurse, Termine) werden nicht an Dritte weitergegeben oder verkauft. Die App stellt lediglich eine Verbindung zur Stud.IP-API der Hochschule Trier her, um deine eigenen Daten abzurufen.{'\n\n'}Campusinhalte (Mensaplan, Campus-Events) werden über Supabase bereitgestellt — dabei werden keine personenbezogenen Daten übertragen.
        </Text>
      </Section>

      <Section title="Datenschutzbeauftragter der Hochschule">
        <Text style={styles.body}>
          Da diese App die Stud.IP-Infrastruktur der Hochschule Trier nutzt, können Anfragen bezüglich der dortigen institutionellen Datenhaltung zusätzlich an den Datenschutzbeauftragten der Hochschule Trier gerichtet werden.
        </Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Web: www.hochschule-trier.de/datenschutz
        </Text>
      </Section>

      <Text style={styles.footer}>Stand: Juli 2026 · UCB App v1.0.0 · Studentenprojekt</Text>
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
