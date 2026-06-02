import rawBuildings from '../data/buildings.json';

export const CAMPUS_CENTER = {
  lat: 49.60818,
  lng: 7.16892,
  label: 'Umwelt-Campus Birkenfeld',
};

function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function dedupe(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export const BUILDINGS = rawBuildings.map((building) => {
  const aliases = dedupe([
    building.id,
    building.number,
    ...(building.aliases ?? []),
    building.shortName,
    building.name,
  ]);

  return {
    ...building,
    id: String(building.id ?? building.number),
    number: String(building.number ?? building.id),
    aliases,
  };
});

export function getAllBuildings() {
  return BUILDINGS;
}

export function getBuildingByIdOrAlias(value) {
  const token = normalizeToken(value);
  if (!token) return null;

  return (
    BUILDINGS.find((building) =>
      building.aliases.some((alias) => normalizeToken(alias) === token)
    ) ?? null
  );
}

export function searchBuildings(query) {
  const token = normalizeToken(query);
  if (!token) return BUILDINGS;

  return BUILDINGS.filter((building) =>
    building.aliases.some((alias) => normalizeToken(alias).includes(token)) ||
    (building.services ?? []).some((service) => normalizeToken(service).includes(token)) ||
    normalizeToken(building.description).includes(token)
  );
}

export function buildFallbackBuilding(buildingId) {
  const number = String(buildingId ?? '').trim();
  if (!number) return null;

  return {
    id: number,
    number,
    name: `Campus Building ${number}`,
    shortName: `Building ${number}`,
    aliases: [number],
    lat: CAMPUS_CENTER.lat,
    lng: CAMPUS_CENTER.lng,
    services: [],
    description:
      'This building appears in your Stud.IP timetable, but detailed campus guide data has not been curated yet.',
    isFallback: true,
  };
}

export function buildNativeMapsLabel(building) {
  if (!building) return CAMPUS_CENTER.label;
  return `${building.name}, Umwelt-Campus Birkenfeld`;
}

const TYPE_COLORS = {
  academic: '#6FAE3E',
  dormitory: '#4A90E2',
  hotel: '#F5A623',
  building: '#78909C',
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.building;
}

const TYPE_LABELS = {
  academic: 'Academic',
  dormitory: 'Housing',
  hotel: 'Hotel',
  building: 'Facility',
};

export function getTypeLabel(type) {
  return TYPE_LABELS[type] ?? 'Building';
}

export function filterBuildingsByType(type) {
  if (!type || type === 'all') return BUILDINGS;
  return BUILDINGS.filter((b) => b.type === type);
}

// Main campus buildings shown on the Map screen: academic/teaching/admin
// buildings plus the Campus Hotel. Student dormitories and generic
// "Building 99XX" entries are intentionally excluded.
const MAIN_BUILDING_TYPES = new Set(['academic', 'hotel']);

export function isMainCampusBuilding(building) {
  return MAIN_BUILDING_TYPES.has(building?.type);
}

const ROOM_TYPE_ICONS = {
  lecture:  'school-outline',
  seminar:  'easel-outline',
  lab:      'flask-outline',
  office:   'person-outline',
  admin:    'business-outline',
  library:  'library-outline',
  facility: 'water-outline',
  workshop: 'construct-outline',
  it:       'hardware-chip-outline',
  aula:     'people-outline',
  study:    'book-outline',
  cafe:     'cafe-outline',
};

export function getRoomTypeIcon(type) {
  return ROOM_TYPE_ICONS[type] ?? 'ellipse-outline';
}

const ROOM_TYPE_LABELS = {
  lecture:  'Lecture Hall',
  seminar:  'Seminar Room',
  lab:      'Laboratory',
  office:   'Office',
  admin:    'Administration',
  library:  'Library',
  facility: 'Facility',
  workshop: 'Workshop',
  it:       'IT / Computer',
  aula:     'Aula / Hall',
  study:    'Study Room',
  cafe:     'Café / Canteen',
};

export function getRoomTypeLabel(type) {
  return ROOM_TYPE_LABELS[type] ?? 'Room';
}
