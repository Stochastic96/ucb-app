import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, BG, BORDER } from '../../constants/colors';
import buildings from '../../data/buildings.json';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const UCB_CENTER = [7.1333, 49.6589];

if (TOKEN) MapboxGL.setAccessToken(TOKEN);

export default function MapScreen() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [visibleBuildings, setVisibleBuildings] = useState(buildings);
  const mapRef = useRef(null);
  const pendingBuilding = useStore((s) => s.pendingMapBuilding);
  const clearPending = useStore((s) => s.clearPendingMapBuilding);

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setVisibleBuildings(buildings.filter((b) => b.name.toLowerCase().includes(q) || b.number.includes(q)));
    } else {
      setVisibleBuildings(buildings);
    }
  }, [search]);

  useEffect(() => {
    if (pendingBuilding) {
      const b = buildings.find((x) => x.id === pendingBuilding);
      if (b) {
        setSelected(b);
        mapRef.current?.setCamera({ centerCoordinate: [b.lng, b.lat], zoomLevel: 17, animationDuration: 500 });
      }
      clearPending();
    }
  }, [pendingBuilding]);

  if (!TOKEN) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={48} color={INACTIVE} />
          <Text style={styles.emptyTitle}>Map Not Configured</Text>
          <Text style={styles.emptyText}>Mapbox token is missing. Check app setup.</Text>
        </View>
      </View>
    );
  }

  const handleNavigate = (b) => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://maps.apple.com/?ll=${b.lat},${b.lng}&q=${encodeURIComponent(b.name)}`);
    } else {
      Linking.openURL(`geo:${b.lat},${b.lng}?q=${encodeURIComponent(b.name)}`);
    }
    setSelected(null);
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={INACTIVE} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search buildings..."
          placeholderTextColor={INACTIVE}
          value={search}
          onChangeText={setSearch}
        />
        {search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={INACTIVE} />
          </TouchableOpacity>
        )}
      </View>

      {/* Map */}
      <MapboxGL.MapView style={styles.map} ref={mapRef} styleURL={MapboxGL.StyleURL.Outdoors}>
        <MapboxGL.Camera centerCoordinate={UCB_CENTER} zoomLevel={16} />
        <MapboxGL.UserLocation />

        {/* Building markers */}
        {visibleBuildings.map((b) => (
          <MapboxGL.PointAnnotation key={b.id} id={b.id} coordinate={[b.lng, b.lat]} onSelected={() => setSelected(b)}>
            <View style={[styles.marker, selected?.id === b.id && styles.markerSelected]}>
              <Text style={styles.markerText}>{b.number}</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Building detail sheet */}
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 12 },
  emptyText: { fontSize: 14, color: INACTIVE, marginTop: 6, textAlign: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  map: { flex: 1 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  markerSelected: { transform: [{ scale: 1.3 }] },
  markerText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 12 },
  sheetNumber: { fontSize: 28, fontWeight: '800', color: PRIMARY },
  sheetName: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  sheetDesc: { fontSize: 14, color: '#555', marginTop: 10, lineHeight: 20 },
  servicesLabel: { fontSize: 12, color: INACTIVE, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  service: { fontSize: 13, color: '#444', marginBottom: 4 },
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
