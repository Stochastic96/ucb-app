import rawBins from '../data/waste_bins.json';
import rawItems from '../data/waste_items.json';

// ─────────────────────────────────────────────────────────────────────────
// Waste Guide — "where does it go?" lookup for Landkreis Birkenfeld.
//
// Pure, offline module over data/waste_bins.json + data/waste_items.json
// (same pattern as services/buildings.js). Search always matches BOTH
// languages regardless of the active app language — internationals often
// only know the German word ("Pfand", "Sperrmüll") and vice versa.
// ─────────────────────────────────────────────────────────────────────────

/** Lowercase, trim, fold German umlauts/ß so "glühbirne" === "gluhbirne". */
export function normalizeWasteToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

const BINS = rawBins;
const BIN_MAP = new Map(BINS.map((bin) => [bin.id, bin]));

// Precompute normalized search terms per item (names + aliases, EN + DE).
const ITEMS = rawItems.map((item) => {
  const terms = [
    item.en?.name,
    item.de?.name,
    ...(item.en?.aliases ?? []),
    ...(item.de?.aliases ?? []),
  ]
    .filter(Boolean)
    .map(normalizeWasteToken);

  return { ...item, _terms: Array.from(new Set(terms)) };
});

export function getAllBins() {
  return BINS;
}

export function getBinById(binId) {
  return BIN_MAP.get(binId) ?? null;
}

export function getAllWasteItems() {
  return ITEMS;
}

export function getWasteItemById(itemId) {
  return ITEMS.find((item) => item.id === itemId) ?? null;
}

/** Returns the active-language copy of an item, falling back to English. */
export function getWasteItemCopy(item, lang = 'en') {
  if (!item) return { name: '', aliases: [], why: '', caution: null };
  return item[lang] ?? item.en;
}

/** Returns the active-language copy of a bin, falling back to English. */
export function getBinCopy(bin, lang = 'en') {
  if (!bin) return { name: '', nativeName: '', tagline: '', belongs: [], never: [], howto: '' };
  return bin[lang] ?? bin.en;
}

/** Variant label in the active language ("Clean" / "Sauber"). */
export function getVariantLabel(variant, lang = 'en') {
  if (!variant) return '';
  return variant[lang] ?? variant.en ?? '';
}

// Match quality, best first: exact term, term starts with query,
// query starts a word inside a term, then substring anywhere.
function scoreItem(item, token) {
  let best = 0;
  for (const term of item._terms) {
    if (term === token) return 4;
    if (term.startsWith(token)) best = Math.max(best, 3);
    else if (term.includes(` ${token}`)) best = Math.max(best, 2);
    else if (term.includes(token)) best = Math.max(best, 1);
  }
  return best;
}

/**
 * Search items by name/alias in both languages.
 * Empty query returns [] — the screen shows bin tiles instead.
 */
export function searchWasteItems(query, limit = 12) {
  const token = normalizeWasteToken(query);
  if (!token) return [];

  return ITEMS.map((item) => ({ item, score: scoreItem(item, token) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.en.name.localeCompare(b.item.en.name)
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** All items whose primary destination is the given bin (for bin detail sheets). */
export function getItemsForBin(binId) {
  return ITEMS.filter((item) => item.bin === binId);
}
