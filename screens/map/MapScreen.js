import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, BG, BORDER } from '../../constants/colors';
import {
  buildFallbackBuilding,
  buildNativeMapsLabel,
  CAMPUS_CENTER,
  getBuildingByIdOrAlias,
  searchBuildings,
} from '../../services/buildings';

export default function MapScreen() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const pendingBuilding = useStore((s) => s.pendingMapBuilding);
  const clearPending = useStore((s) => s.clearPendingMapBuilding);

  const visibleBuildings = searchBuildings(search);

  useEffect(() => {
    if (pendingBuilding) {
      const b = getBuildingByIdOrAlias(pendingBuilding) ?? buildFallbackBuilding(pendingBuilding);
      if (b) setSelected(b);
      clearPending();
    }
  }, [pendingBuilding, clearPending]);

  const handleNavigate = (b) => {
    const label = buildNativeMapsLabel(b);
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://maps.apple.com/?ll=${b.lat},${b.lng}&q=${encodeURIComponent(label)}`);
    } else {
      Linking.openURL(`geo:${b.lat},${b.lng}?q=${encodeURIComponent(label)}`);
    }
    setSelected(null);
  };

  const handleOpenCampus = () => {
    const label = CAMPUS_CENTER.label;
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://maps.apple.com/?ll=${CAMPUS_CENTER.lat},${CAMPUS_CENTER.lng}&q=${encodeURIComponent(label)}`);
    } else {
      Linking.openURL(`geo:${CAMPUS_CENTER.lat},${CAMPUS_CENTER.lng}?q=${encodeURIComponent(label)}`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="map-outline" size={24} color={PRIMARY} />
          </View>
          <Text style={styles.heroTitle}>Campus Guide</Text>
          <Text style={styles.heroText}>
            Browse buildings here and open turn-by-turn directions in Apple Maps.
          </Text>
          <TouchableOpacity style={styles.campusButton} onPress={handleOpenCampus} activeOpacity={0.85}>
            <Ionicons name="navigate-outline" size={18} color="#fff" />
            <Text style={styles.campusButtonText}>Open Campus in Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={INACTIVE} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search buildings..."
            placeholderTextColor={INACTIVE}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={INACTIVE} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.countText}>
          {visibleBuildings.length} building{visibleBuildings.length === 1 ? '' : 's'}
        </Text>

        {visibleBuildings.length > 0 ? (
          visibleBuildings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.buildingCard}
              onPress={() => setSelected(b)}
              activeOpacity={0.85}
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
              <Ionicons name="chevron-forward" size={18} color={INACTIVE} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={42} color={INACTIVE} />
            <Text style={styles.emptyTitle}>No buildings found</Text>
            <Text style={styles.emptyText}>Try another name, short name, or building number.</Text>
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
                    <Text style={styles.servicesLabel}>Services</Text>
                    {selected.services.map((svc, i) => (
                      <Text key={i} style={styles.service}>
                        • {svc}
                      </Text>
                    ))}
                  </>
                )}
                {selected.isFallback ? (
                  <Text style={styles.fallbackNote}>
                    Exact in-app guide data is still being curated for this building. Directions will open at the campus with your building number in the query.
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => handleNavigate(selected)}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.navBtnText}>Navigate Here</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 12, paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#F4F7FB',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2ECF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  heroText: { fontSize: 14, color: '#506070', marginTop: 6, lineHeight: 20 },
  campusButton: {
    marginTop: 14,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  campusButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 12 },
  emptyText: { fontSize: 14, color: INACTIVE, marginTop: 6, textAlign: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  countText: { marginTop: 12, marginBottom: 8, color: INACTIVE, fontSize: 13, fontWeight: '600' },
  buildingCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
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
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingBadgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  buildingInfo: { flex: 1 },
  buildingName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  buildingMeta: { fontSize: 12, color: INACTIVE, marginTop: 3 },
  buildingDesc: { fontSize: 13, color: '#4A5560', marginTop: 6, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 12 },
  sheetNumber: { fontSize: 28, fontWeight: '800', color: PRIMARY },
  sheetName: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  sheetDesc: { fontSize: 14, color: '#555', marginTop: 10, lineHeight: 20 },
  servicesLabel: { fontSize: 12, color: INACTIVE, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  service: { fontSize: 13, color: '#444', marginBottom: 4 },
  fallbackNote: { fontSize: 13, color: INACTIVE, marginTop: 12, lineHeight: 18 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    justifyContent: 'center',
    gap: 8,
  },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
