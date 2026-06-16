import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';

export default function InfoSectionView({ data }) {
  const [expanded, setExpanded] = useState({});
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);

  const toggle = (id) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Ionicons name="information-circle-outline" size={20} color={c.mode === 'dark' ? '#90CAF9' : '#1565C0'} style={{ marginRight: 8, marginTop: 1 }} />
        <Text style={styles.summaryText}>{data.summary}</Text>
      </View>

      {/* Key concepts */}
      {data.concepts && data.concepts.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>KEY CONCEPTS</Text>
          {data.concepts.map((concept) => (
            <TouchableOpacity
              key={concept.id}
              style={styles.conceptCard}
              onPress={() => toggle(concept.id)}
              activeOpacity={0.85}
            >
              <View style={styles.conceptHeader}>
                <Text style={styles.conceptTitle}>{concept.title}</Text>
                <Ionicons
                  name={expanded[concept.id] ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={c.primary}
                />
              </View>
              {expanded[concept.id] && (
                <Text style={styles.conceptBody}>{concept.body}</Text>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Official sources */}
      {data.links && data.links.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>OFFICIAL SOURCES</Text>
          <View style={styles.linksNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={c.mode === 'dark' ? '#81C784' : '#2E7D32'} style={{ marginRight: 6 }} />
            <Text style={styles.linksNoteText}>
              These links open official sources. The app explains — official sources confirm.
            </Text>
          </View>
          {data.links.map((link) => (
            <TouchableOpacity
              key={link.id}
              style={styles.linkCard}
              onPress={() => { if (/^(https?|tel|mailto):/i.test(link.url)) Linking.openURL(link.url); }}
              activeOpacity={0.8}
            >
              <View style={styles.linkLeft}>
                <Text style={styles.linkTitle}>{link.title}</Text>
                <Text style={styles.linkDesc}>{link.desc}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={c.primary} />
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  contentContainer: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: c.mode === 'dark' ? '#2196F315' : '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.mode === 'dark' ? '#2196F330' : '#BBDEFB',
    alignItems: 'flex-start',
  },
  summaryText: { flex: 1, fontSize: 14, color: c.mode === 'dark' ? '#90CAF9' : '#0D47A1', lineHeight: 22 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  conceptCard: {
    backgroundColor: c.surface,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  conceptTitle: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
  conceptBody: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 10,
  },
  linksNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.mode === 'dark' ? '#2E7D3220' : '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  linksNoteText: { flex: 1, fontSize: 12, color: c.mode === 'dark' ? '#81C784' : '#2E7D32', lineHeight: 18 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
  },
  linkLeft: { flex: 1, marginRight: 8 },
  linkTitle: { fontSize: 14, fontWeight: '600', color: c.primary },
  linkDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },
});
