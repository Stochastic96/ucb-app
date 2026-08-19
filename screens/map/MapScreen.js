import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store/useStore';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import {
  buildFallbackBuilding,
  buildNativeMapsLabel,
  CAMPUS_CENTER,
  getBuildingByIdOrAlias,
  isMainCampusBuilding,
  searchBuildings,
} from '../../services/buildings';
import { useFocusEffect } from '@react-navigation/native';
import { openInMaps } from '../../services/linking';
import { useTranslation } from '../../services/i18n';

export default function MapScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const searchTrackedRef = React.useRef(false);

  const handleSearchChange = (text) => {
    if (text.length === 1 && !searchTrackedRef.current) {
      searchTrackedRef.current = true;
    }
    if (text.length === 0) searchTrackedRef.current = false;
    setSearch(text);
  };
  const pendingBuilding = useStore((s) => s.pendingMapBuilding);
  const clearPending = useStore((s) => s.clearPendingMapBuilding);

  const visibleBuildings = searchBuildings(search).filter(isMainCampusBuilding);


  useEffect(() => {
    if (pendingBuilding) {
      const b = getBuildingByIdOrAlias(pendingBuilding) ?? buildFallbackBuilding(pendingBuilding);
      if (b) setSelected(b);
      clearPending();
    }
  }, [pendingBuilding, clearPending]);

  const handleNavigate = (b) => {
    openInMaps(b.lat, b.lng, buildNativeMapsLabel(b));
    setSelected(null);
  };

  const handleOpenCampus = () => {
    openInMaps(CAMPUS_CENTER.lat, CAMPUS_CENTER.lng, CAMPUS_CENTER.label);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="map-outline" size={24} color={c.brandIcon} />
          </View>
          <Text style={styles.heroTitle}>{t('map_title')}</Text>
          <Text style={styles.heroText}>{t('map_subtitle')}</Text>
          <TouchableOpacity style={styles.campusButton} onPress={handleOpenCampus} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('map_open_campus')}>
            <Ionicons name="navigate-outline" size={18} color={c.onPrimary} />
            <Text style={styles.campusButtonText}>{t('map_open_campus')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('map_search_placeholder')}
            placeholderTextColor={c.textMuted}
            value={search}
            onChangeText={handleSearchChange}
          />
          {search ? (
            <TouchableOpacity onPress={() => { searchTrackedRef.current = false; setSearch(''); }}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.countText}>
          {visibleBuildings.length === 1 ? t('map_buildings_count_one') : t('map_buildings_count', { count: visibleBuildings.length })}
        </Text>

        {visibleBuildings.length > 0 ? (
          visibleBuildings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.buildingCard}
              onPress={() => setSelected(b)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${b.number}, ${b.name}`}
            >
              <View style={styles.buildingBadge}>
                <Text style={styles.buildingBadgeText}>{b.number}</Text>
              </View>
              <View style={styles.buildingInfo}>
                <Text style={styles.buildingName}>{b.name}</Text>
                <Text style={styles.buildingMeta}>{b.shortName}</Text>
                {!!b.description && (
                  <Text style={styles.buildingDesc} numberOfLines={2}>
                    {b.description}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={42} color={c.textMuted} />
            <Text style={styles.emptyTitle}>{t('map_no_results_title')}</Text>
            <Text style={styles.emptyText}>{t('map_no_results_msg')}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            {selected && (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetNumber}>{selected.number}</Text>
                <Text style={styles.sheetName}>{selected.name}</Text>
                {!!selected.description && (
                  <Text style={styles.sheetDesc}>{selected.description}</Text>
                )}
                {selected.services && selected.services.length > 0 && (
                  <>
                    <Text style={styles.servicesLabel}>{t('map_services')}</Text>
                    {selected.services.map((svc, i) => (
                      <Text key={i} style={styles.service}>
                        • {svc}
                      </Text>
                    ))}
                  </>
                )}
                {selected.isFallback ? (
                  <Text style={styles.fallbackNote}>{t('map_fallback_note')}</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => handleNavigate(selected)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('map_navigate')}: ${selected.name}`}
                >
                  <Ionicons name="navigate" size={18} color={c.onPrimary} />
                  <Text style={styles.navBtnText}>{t('map_navigate')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 12, paddingBottom: 32 },
  heroCard: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.infoSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { ...c.type.titleLg, color: c.text },
  heroText: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, marginTop: 6 },
  campusButton: {
    marginTop: 14,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  campusButtonText: { ...c.type.bodyStrong, color: c.onPrimary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { ...c.type.title, color: c.text, marginTop: 12 },
  emptyText: { ...c.type.bodySm, fontSize: 14, color: c.textMuted, marginTop: 6, textAlign: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontFamily: c.fonts.body, fontSize: 14, color: c.text },
  countText: { ...c.type.label, marginTop: 12, marginBottom: 8, color: c.textMuted },
  buildingCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buildingBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingBadgeText: { ...c.type.bodyStrong, fontFamily: c.fonts.bodyBold, color: c.onPrimary },
  buildingInfo: { flex: 1 },
  buildingName: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text },
  buildingMeta: { ...c.type.caption, color: c.textMuted, marginTop: 3 },
  buildingDesc: { ...c.type.bodySm, color: c.textSecondary, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 12 },
  sheetNumber: { ...c.type.display, color: c.brandIcon },
  sheetName: { ...c.type.titleLg, fontSize: 20, color: c.text, marginTop: 2 },
  sheetDesc: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, marginTop: 10 },
  servicesLabel: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, color: c.textMuted, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  service: { ...c.type.bodySm, color: c.textSecondary, marginBottom: 4 },
  fallbackNote: { ...c.type.bodySm, color: c.textMuted, marginTop: 12 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    justifyContent: 'center',
    gap: 8,
  },
  navBtnText: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.onPrimary },
});
