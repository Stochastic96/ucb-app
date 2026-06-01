import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Linking,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store/useStore';
import { trackScreen, trackEvent } from '../../services/analytics';
import {
  CAMPUS_CENTER,
  getBuildingByIdOrAlias,
  buildFallbackBuilding,
  buildNativeMapsLabel,
  filterBuildingsByType,
  getTypeColor,
  getTypeLabel,
} from '../../services/buildings';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.46;

const INITIAL_REGION = {
  latitude: CAMPUS_CENTER.lat,
  longitude: CAMPUS_CENTER.lng,
  latitudeDelta: 0.014,
  longitudeDelta: 0.014,
};

// OpenStreetMap raster tiles — no Google Maps API key required.
// Rendered via <UrlTile> on top of a base-less map (mapType="none").
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const FILTERS = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'academic', label: 'Academic', icon: 'school-outline' },
  { id: 'dormitory', label: 'Housing', icon: 'home-outline' },
  { id: 'hotel', label: 'Hotel', icon: 'bed-outline' },
];

function BuildingMarker({ building, isSelected, onSelect }) {
  const color = getTypeColor(building.type);
  const pulse = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (isSelected) {
      Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, damping: 8, stiffness: 180 }).start();
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 950, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10 }).start();
      pulse.setValue(0);
    }
    return () => loopRef.current?.stop();
  }, [isSelected]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.25, 0] });

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.85}>
      <Animated.View style={[styles.markerWrap, { transform: [{ scale }] }]}>
        {isSelected && (
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: color, transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
        )}
        <View
          style={[
            styles.badge,
            { backgroundColor: color },
            isSelected && styles.badgeSelected,
          ]}
        >
          <Text style={styles.badgeNum}>{building.number.slice(-2)}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const pendingBuilding = useStore((s) => s.pendingMapBuilding);
  const clearPending = useStore((s) => s.clearPendingMapBuilding);

  useEffect(() => { trackScreen('MapScreen'); }, []);

  // Handle deep-link from timetable
  useEffect(() => {
    if (pendingBuilding) {
      const b = getBuildingByIdOrAlias(pendingBuilding) ?? buildFallbackBuilding(pendingBuilding);
      if (b) selectBuilding(b);
      clearPending();
    }
  }, [pendingBuilding]);

  const visibleBuildings = (() => {
    const byType = filterBuildingsByType(activeFilter);
    if (!search.trim()) return byType;
    const token = search.toLowerCase().trim();
    return byType.filter(
      (b) =>
        b.name.toLowerCase().includes(token) ||
        b.number.includes(token) ||
        (b.aliases ?? []).some((a) => a.toLowerCase().includes(token))
    );
  })();

  const openSheet = useCallback(() => {
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 140,
    }).start();
  }, [sheetAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSelected(null));
  }, [sheetAnim]);

  const selectBuilding = useCallback(
    (building) => {
      setSelected(building);
      trackEvent('feature_use', 'map_building_opened', { building: building.number, type: building.type });
      openSheet();
      mapRef.current?.animateToRegion(
        {
          latitude: building.lat - 0.0010,
          longitude: building.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        550
      );
    },
    [openSheet]
  );

  const resetCamera = () => {
    closeSheet();
    setTimeout(() => {
      mapRef.current?.animateToRegion(INITIAL_REGION, 500);
    }, selected ? 240 : 0);
  };

  const handleNavigate = (building) => {
    const label = buildNativeMapsLabel(building);
    if (Platform.OS === 'ios') {
      Linking.openURL(
        `maps://maps.apple.com/?ll=${building.lat},${building.lng}&q=${encodeURIComponent(label)}`
      );
    } else {
      Linking.openURL(`geo:${building.lat},${building.lng}?q=${encodeURIComponent(label)}`);
    }
  };

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_H + 60, 0],
  });

  const mapDim = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Map — OpenStreetMap tiles over a base-less map (no API key needed) */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={INITIAL_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={() => { if (selected) closeSheet(); }}
      >
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19}
          flipY={false}
          shouldReplaceMapContent
          tileSize={256}
          zIndex={-1}
        />
        {visibleBuildings.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            tracksViewChanges={selected?.id === b.id}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <BuildingMarker
              building={b}
              isSelected={selected?.id === b.id}
              onSelect={() => selectBuilding(b)}
            />
          </Marker>
        ))}
      </MapView>

      {/* Dim overlay when sheet is open */}
      <Animated.View
        style={[styles.dimOverlay, { opacity: mapDim }]}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#6B7A99" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search buildings..."
              placeholderTextColor="#4A5568"
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#4A5568" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            const color = f.id === 'all' ? '#6FAE3E' : getTypeColor(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterPill, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={active ? '#fff' : '#6B7A99'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Reset / campus button */}
      <TouchableOpacity style={styles.resetBtn} onPress={resetCamera} activeOpacity={0.85}>
        <Ionicons name="navigate-circle-outline" size={22} color="#6FAE3E" />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: sheetTranslate }], paddingBottom: insets.bottom + 12 },
        ]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {selected && (
          <>
            {/* Close */}
            <TouchableOpacity style={styles.sheetClose} onPress={closeSheet}>
              <Ionicons name="close" size={20} color="#6B7A99" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={[styles.typeDot, { backgroundColor: getTypeColor(selected.type) }]} />
              <Text style={styles.typeLabel}>{getTypeLabel(selected.type).toUpperCase()}</Text>
            </View>
            <Text style={styles.sheetNumber}>{selected.number}</Text>
            <Text style={styles.sheetName}>{selected.name}</Text>

            <View style={styles.divider} />

            {/* Services */}
            {selected.services && selected.services.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.servicesScroll}
                contentContainerStyle={styles.servicesContent}
              >
                {selected.services.map((svc, i) => (
                  <View key={i} style={styles.servicePill}>
                    <Text style={styles.servicePillText}>{svc}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Description */}
            {!!selected.description && (
              <Text style={styles.sheetDesc} numberOfLines={3}>
                {selected.description}
              </Text>
            )}

            {/* Floors */}
            {!!selected.floors && (
              <Text style={styles.floorsText}>
                <Ionicons name="layers-outline" size={13} color="#6B7A99" />{' '}
                {selected.floors} {selected.floors === 1 ? 'floor' : 'floors'}
              </Text>
            )}

            {selected.isFallback && (
              <Text style={styles.fallbackNote}>
                This building appears in your timetable. Detailed info coming soon.
              </Text>
            )}

            {/* Navigate */}
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: getTypeColor(selected.type) }]}
              onPress={() => handleNavigate(selected)}
              activeOpacity={0.88}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.navBtnText}>Navigate to Entrance</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#AAD3DF' },
  map: { flex: 1 },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    pointerEvents: 'none',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.94)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#E2E8F0' },

  // Filter pills
  filtersScroll: { marginTop: 8 },
  filtersContent: { paddingRight: 8, gap: 8, flexDirection: 'row' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  filterLabel: { fontSize: 12, color: '#6B7A99', fontWeight: '600' },
  filterLabelActive: { color: '#fff' },

  // Reset button
  resetBtn: {
    position: 'absolute',
    right: 16,
    bottom: SCREEN_H * 0.5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(111,174,62,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Marker
  markerWrap: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  badgeSelected: {
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  badgeNum: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  pulseRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SHEET_H,
    backgroundColor: '#141824',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetClose: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { fontSize: 11, color: '#6B7A99', fontWeight: '700', letterSpacing: 1 },
  sheetNumber: { fontSize: 38, fontWeight: '800', color: '#F1F5F9', lineHeight: 44 },
  sheetName: { fontSize: 16, fontWeight: '600', color: '#CBD5E1', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 14 },

  // Services
  servicesScroll: { marginBottom: 12 },
  servicesContent: { gap: 8, flexDirection: 'row' },
  servicePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  servicePillText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  sheetDesc: { fontSize: 13.5, color: '#64748B', lineHeight: 20, marginBottom: 8 },
  floorsText: { fontSize: 12, color: '#4A5568', marginBottom: 12 },
  fallbackNote: { fontSize: 12, color: '#4A5568', marginBottom: 12, lineHeight: 18 },

  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
