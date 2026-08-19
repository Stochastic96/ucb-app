import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { withAlpha } from '../constants/colors';

// ─────────────────────────────────────────────────────────────────────────────
// ListRow — THE list-first design contract for hub screens.
//
// The app deliberately presents dense information as calm, uniform rows rather
// than tile grids (product decision 2026-07-27). Every hub row in the app —
// Tools, Guide categories, Home quick links, Getting-started steps — renders
// through this component so spacing, type and iconography stay identical.
//
// Contract (do not fork these values in screens):
//   anatomy   [icon tile] [title + one-line subtitle] [right accessory]
//   icon tile 40×40, radius.md, tinted background (10–16% alpha of icon color)
//   title     type.bodyStrong · text        (1 line)
//   subtitle  type.bodySm · textSecondary   (1 line, optional)
//   card      surface bg, radius.lg, shadows.card, mH 12, mB 8, padding 14, gap 14
//   compact   44px min height, no card chrome — for rows inside an existing card
//   right     chevron by default; pass `badge` for a count; `right` for custom
// ─────────────────────────────────────────────────────────────────────────────
export default function ListRow({
  icon,
  iconColor, // optional { bg, icon } — defaults to the brand tint
  title,
  subtitle,
  onPress,
  badge, // red urgency badge (unread counts)
  count, // neutral quantity pill (e.g. "12 entries")
  right = 'chevron',
  compact = false,
  accessibilityLabel,
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tile = iconColor ?? { bg: withAlpha(c.primary, '14'), icon: c.primary };

  return (
    <TouchableOpacity
      style={compact ? styles.compactRow : styles.cardRow}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}: ${subtitle}` : title)}
    >
      <View style={[styles.iconTile, { backgroundColor: tile.bg }, compact && styles.iconTileCompact]}>
        <Ionicons name={icon} size={compact ? 18 : 22} color={tile.icon} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {count != null && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
      {right === 'chevron' ? (
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      ) : (
        right
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c) => StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: c.radius.lg,
    gap: 14,
    ...c.shadows.card,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 12,
  },
  iconTile: {
    width: 40, height: 40, borderRadius: c.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTileCompact: { width: 32, height: 32 },
  body: { flex: 1 },
  title: { ...c.type.bodyStrong, color: c.text },
  subtitle: { ...c.type.bodySm, color: c.textSecondary, marginTop: 1 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.error,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { ...c.type.micro, color: '#fff', fontFamily: c.fonts.bodySemiBold },
  countPill: {
    minWidth: 24, height: 20, borderRadius: 10, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  countText: { ...c.type.micro, color: c.textSecondary, fontFamily: c.fonts.bodySemiBold },
});
