// Campus Radar — degree-program lookup over data/campus_programs.json.
//
// Pure offline module (pattern of services/buildings.js). Programs travel on
// the air as their 1-byte `id` (ProfileCard v3), never as text — the localized
// name is rendered from this bundled list on the receiving device. Ids are
// stable wire format: never renumbered, never reused.

import programsData from '../data/campus_programs.json';

export const PROGRAM_LEVELS = ['bachelor', 'master', 'other'];

const PROGRAMS = programsData.programs;
const BY_ID = new Map(PROGRAMS.map((p) => [p.id, p]));

// Fold umlauts/ß so "Umwelt" matches "umwelt" and "Verfahrenstechnik" is
// findable without exact diacritics (same normalization idea as services/waste.js).
function fold(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getAllPrograms() {
  return PROGRAMS;
}

export function getProgramById(id) {
  return BY_ID.get(Number(id)) ?? null;
}

export function isValidProgramId(id) {
  return BY_ID.has(Number(id));
}

// Localized display name, English fallback. Returns '' for 0/unknown so the
// UI can hide the row entirely when a peer chose not to share a program.
export function getProgramLabel(id, lang = 'en') {
  const p = getProgramById(id);
  if (!p) return '';
  return (lang === 'de' ? p.de : p.en) || p.en;
}

export function getProgramDegree(id) {
  return getProgramById(id)?.degree ?? '';
}

// Search across BOTH languages regardless of the active app language, so an
// international student typing "renewable" and a German typing "erneuerbar"
// both find the same entry.
export function searchPrograms(query) {
  const q = fold(query);
  if (!q) return PROGRAMS;
  return PROGRAMS.filter(
    (p) => fold(p.de).includes(q) || fold(p.en).includes(q) || fold(p.degree).includes(q)
  );
}

// [{ level, data: [...] }] for SectionList grouping in the picker.
export function groupProgramsByLevel(programs = PROGRAMS) {
  return PROGRAM_LEVELS.map((level) => ({
    level,
    data: programs.filter((p) => p.level === level),
  })).filter((s) => s.data.length > 0);
}
