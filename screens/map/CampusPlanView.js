import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { getBuildingByIdOrAlias } from '../../services/buildings';

// Canvas dimensions (design pixels)
const CW = 840;   // canvas width  → always needs horizontal scroll
const CH = 780;   // canvas height → includes YO padding at top
const YO = 120;   // y-offset: clears the overlaid header bar

// ─────────────────────────────────────────────────────────────────────────────
// Building layout — positions match the official Umwelt-Campus Birkenfeld map
//   id:  building ID for lookup (null = non-interactive landmark)
//   lbl: label shown on the block (use known German name first, e.g. "KG\n9938")
//   sub: smaller secondary label
//   bg:  background colour
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_BLDGS = [
  // ── Far west ──────────────────────────────────────────────────────────────
  { id: null,   lbl: 'Sport-\nhalle',  x: 8,   y: 192, w: 105, h: 106, bg: '#1B2B4B' },
  // ── Nordwesten ────────────────────────────────────────────────────────────
  { id: '9929', lbl: 'Hotel\n9929',    x: 135, y: 118, w: 55,  h: 52,  bg: '#1B2B4B' },
  { id: '9928', lbl: '9928',           x: 135, y: 194, w: 62,  h: 116, bg: '#1B2B4B' },
  { id: '9930', lbl: '9930',           x: 132, y: 358, w: 64,  h: 124, bg: '#1B2B4B' },
  // ── Norden ────────────────────────────────────────────────────────────────
  { id: '9935', lbl: '9935',           x: 310, y: 28,  w: 86,  h: 50,  bg: '#1B2B4B' },
  // ── West-Mitte ────────────────────────────────────────────────────────────
  { id: '9927', lbl: '9927',           x: 218, y: 152, w: 62,  h: 124, bg: '#1B2B4B' },
  { id: '9926', lbl: '9926',           x: 218, y: 300, w: 62,  h: 136, bg: '#1B2B4B' },
  // ── Hauptgebäudereihe (West → Ost) ────────────────────────────────────────
  { id: '9925', lbl: 'IBT\n9925',      x: 292, y: 148, w: 62,  h: 200, bg: '#B83225' },
  { id: '9924', lbl: 'Aula\n9924',     x: 364, y: 148, w: 70,  h: 140, bg: '#1B2B4B' },
  // ZN = Zentraler Neubau | BIB = Bibliothek
  { id: '9922', lbl: 'ZN',             x: 442, y: 100, w: 112, h: 220, bg: '#1B2B4B', sub: 'BIB' },
  { id: '9917', lbl: '9917',           x: 562, y: 148, w: 70,  h: 128, bg: '#1B2B4B' },
  { id: '9916', lbl: '9916',           x: 642, y: 148, w: 70,  h: 138, bg: '#1B2B4B' },
  { id: '9915', lbl: '9915',           x: 722, y: 148, w: 68,  h: 138, bg: '#1B2B4B' },
  // ── Nordost-Lehrgebäude ───────────────────────────────────────────────────
  { id: '9913', lbl: '9913',           x: 576, y: 60,  w: 62,  h: 70,  bg: '#1B2B4B' },
  { id: '9912', lbl: '9912',           x: 648, y: 60,  w: 62,  h: 70,  bg: '#1B2B4B' },
  // ── Wohnheime (Nordost) ───────────────────────────────────────────────────
  { id: '9911', lbl: '9911',           x: 648, y: 18,  w: 62,  h: 36,  bg: '#2D5886' },
  { id: '9907', lbl: '9907',           x: 722, y: 18,  w: 68,  h: 88,  bg: '#2D5886' },
  { id: '9905', lbl: '9905',           x: 800, y: 116, w: 36,  h: 116, bg: '#2D5886' },
  // ── Ost ──────────────────────────────────────────────────────────────────
  { id: '9914', lbl: '9914',           x: 648, y: 228, w: 62,  h: 64,  bg: '#1B2B4B' },
  { id: '9906', lbl: '9906',           x: 722, y: 300, w: 68,  h: 62,  bg: '#2D5886' },
  // ── Wohnheime (Südost) ────────────────────────────────────────────────────
  { id: '9908', lbl: '9908',           x: 576, y: 374, w: 62,  h: 60,  bg: '#2D5886' },
  { id: '9904', lbl: '9904',           x: 648, y: 380, w: 68,  h: 74,  bg: '#2D5886' },
  { id: '9902', lbl: '9902',           x: 722, y: 378, w: 68,  h: 122, bg: '#2D5886' },
  // ── Süden ─────────────────────────────────────────────────────────────────
  // KG = Kommunikationsgebäude (allgemein bekannter Name)
  { id: '9938', lbl: 'KG\n9938',       x: 402, y: 396, w: 110, h: 104, bg: '#1B2B4B' },
  { id: '9940', lbl: '9940',           x: 648, y: 474, w: 68,  h: 70,  bg: '#1B2B4B' },
  { id: '9903', lbl: '9903',           x: 648, y: 572, w: 68,  h: 50,  bg: '#2D5886' },
];

// Parkplätze [x, y, Breite, Höhe]
const PARKING = [
  [280, 28,  80, 66],
  [374, 28,  60, 54],
  [128, 340, 70, 84],
  [368, 458, 70, 56],
  [520, 458, 70, 56],
  [798, 540, 52, 70],
];

// Straßenbeschriftungen
const STRASSENLABELS = [
  { t: 'B41 ↑',           x: 8,   y: 4   },
  { t: 'Campus Allee →',  x: 796, y: 96  },
  { t: 'Neubrückerstr.',  x: 218, y: 596 },
  { t: 'Hoppstädten →',  x: 666, y: 596 },
];

const LEGENDE = [
  ['#1B2B4B', 'Lehrgebäude / Verwaltung'],
  ['#B83225', 'IBT Technikum'],
  ['#2D5886', 'Studierendenwohnheim'],
  ['#6FAE3E', 'Parkplatz'],
];

export default function CampusPlanView({ onSelectBuilding, selectedId }) {
  const hScrollRef = useRef(null);

  // Initiale Scroll-Position: zentrale Lehrgebäudereihe anzeigen
  useEffect(() => {
    const t = setTimeout(() => {
      hScrollRef.current?.scrollTo({ x: 180, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    // Außen: vertikales Scrollen (für südliche Gebäude auf kleinen Geräten)
    <ScrollView
      style={styles.outer}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={{ height: CH }}>
        {/* Innen: horizontales Scrollen (Campusplan breiter als Hochformat) */}
        <ScrollView
          ref={hScrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: CW, height: CH }}
        >
          {/* Campusgelände-Hintergrund */}
          <View style={[StyleSheet.absoluteFill, styles.ground]} />

          {/* Straßenbeschriftungen */}
          {STRASSENLABELS.map((l, i) => (
            <Text key={i} style={[styles.strassenLbl, { left: l.x, top: l.y + YO }]}>
              {l.t}
            </Text>
          ))}

          {/* Parkplätze */}
          {PARKING.map(([x, y, w, h], i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x, top: y + YO, width: w, height: h,
                backgroundColor: '#6FAE3E',
                borderRadius: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={styles.parkplatzLbl}>P</Text>
            </View>
          ))}

          {/* Gebäude */}
          {PLAN_BLDGS.map((b, i) => {
            const gebaeude = b.id ? getBuildingByIdOrAlias(b.id) : null;
            const ausgewaehlt = b.id != null && b.id === selectedId;

            return (
              <TouchableOpacity
                key={b.id ?? `landmark${i}`}
                activeOpacity={b.id ? 0.72 : 1}
                onPress={() => gebaeude && onSelectBuilding(gebaeude)}
                style={[
                  styles.gebaeude,
                  {
                    left: b.x,
                    top: b.y + YO,
                    width: b.w,
                    height: b.h,
                    backgroundColor: b.bg,
                  },
                  ausgewaehlt && styles.gebaeudeAusgewaehlt,
                ]}
              >
                <Text style={styles.gebaeudeText}>{b.lbl}</Text>
                {b.sub != null && <Text style={styles.gebaeudeSub}>{b.sub}</Text>}
              </TouchableOpacity>
            );
          })}

          {/* Legende */}
          <View style={styles.legende}>
            {LEGENDE.map(([farbe, label]) => (
              <View key={label} style={styles.legendeZeile}>
                <View style={[styles.legendePunkt, { backgroundColor: farbe }]} />
                <Text style={styles.legendeText}>{label}</Text>
              </View>
            ))}
            <Text style={styles.legendeHinweis}>Gebäude antippen für Details</Text>
          </View>

          {/* Kompassrose */}
          <View style={styles.kompass}>
            <Text style={styles.kompassN}>N</Text>
            <Text style={styles.kompassPfeil}>↑</Text>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  ground: {
    backgroundColor: '#C4C8B6',
  },
  strassenLbl: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.2,
  },
  parkplatzLbl: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  gebaeude: {
    position: 'absolute',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  gebaeudeAusgewaehlt: {
    borderWidth: 2.5,
    borderColor: '#6FAE3E',
    shadowColor: '#6FAE3E',
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 8,
  },
  gebaeudeText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  gebaeudeSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
  },
  legende: {
    position: 'absolute',
    bottom: 12,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 10,
    padding: 9,
    gap: 5,
  },
  legendeZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendePunkt: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendeText: {
    fontSize: 9.5,
    color: '#222',
    fontWeight: '600',
  },
  legendeHinweis: {
    fontSize: 8.5,
    color: '#888',
    marginTop: 3,
    fontStyle: 'italic',
  },
  kompass: {
    position: 'absolute',
    top: YO + 8,
    right: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    width: 28,
    height: 28,
    justifyContent: 'center',
  },
  kompassN: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B83225',
    lineHeight: 9,
  },
  kompassPfeil: {
    fontSize: 10,
    color: '#1B2B4B',
    lineHeight: 11,
  },
});
