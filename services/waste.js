import rawBins from '../data/waste_bins.json';
import rawItems from '../data/waste_items.json';

// ─────────────────────────────────────────────────────────────────────────
// Waste Guide — "where does it go?" lookup for Landkreis Birkenfeld.
//
// A pure, fully-offline text-search module over two curated, authoritative
// bundled lists (data/waste_bins.json + data/waste_items.json) — the same
// pattern as services/buildings.js. There is no camera, no AI classifier and
// no network call: every answer comes from checking the query against the
// hand-curated item/alias list. Search always matches BOTH languages
// regardless of the active app language — internationals often only know the
// German word ("Pfand", "Sperrmüll") and vice versa.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fold a string to a comparable search token: lowercase, strip German
 * umlauts/ß ("glühbirne" === "gluhbirne"), turn any punctuation/symbol into a
 * space so hyphenated/compound spellings tokenize ("t-shirt" → "t shirt"),
 * then collapse whitespace. Both the query and every list term pass through
 * here, so the two sides always fold identically.
 */
export function normalizeWasteToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BINS = rawBins;
const BIN_MAP = new Map(BINS.map((bin) => [bin.id, bin]));

// Precompute the normalized search terms per item (names + aliases, EN + DE).
// This is the authoritative term list every query is checked against.
const ITEMS = rawItems.map((item) => {
  const terms = [
    item.en?.name,
    item.de?.name,
    ...(item.en?.aliases ?? []),
    ...(item.de?.aliases ?? []),
  ]
    .filter(Boolean)
    .map(normalizeWasteToken)
    .filter(Boolean);

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

// Match quality of one query token against one list term, best first:
// exact term, term starts with the token, token starts a word inside the
// term, then substring anywhere.
function scoreTerm(term, token) {
  if (term === token) return 4;
  if (term.startsWith(token)) return 3;
  if (term.includes(` ${token}`)) return 2;
  if (term.includes(token)) return 1;
  return 0;
}

// Best score any of an item's terms gives to a single token (0 = no match).
function scoreItemForToken(item, token) {
  let best = 0;
  for (const term of item._terms) {
    const s = scoreTerm(term, token);
    if (s > best) best = s;
    if (best === 4) break;
  }
  return best;
}

/**
 * Search items by name/alias across BOTH languages against the authoritative
 * bundled list. Empty query returns [] — the screen shows bin tiles instead.
 *
 * Ranking combines two signals so results are precise and typo/word-order
 * tolerant:
 *   1. Whole-phrase match — the normalized query as one string (rewards
 *      "beer bottle" landing exactly on the "beer bottle" item), weighted high.
 *   2. Per-token AND match — EVERY word of the query must match some term of
 *      the item; the summed token scores break ties and let out-of-order or
 *      multi-word queries ("cup coffee") still find "coffee cup".
 * An item qualifies if it matches the whole phrase OR matches every token.
 */
export function searchWasteItems(query, limit = 12) {
  const normalized = normalizeWasteToken(query);
  if (!normalized) return [];

  const tokens = normalized.split(' ').filter(Boolean);

  const scored = [];
  for (const item of ITEMS) {
    const phraseScore = tokens.length > 1 ? scoreItemForToken(item, normalized) : 0;

    let tokenSum = 0;
    let allTokensMatch = true;
    for (const token of tokens) {
      const s = scoreItemForToken(item, token);
      if (s === 0) {
        allTokensMatch = false;
        break;
      }
      tokenSum += s;
    }

    if (!allTokensMatch && phraseScore === 0) continue;

    // Phrase hits dominate; scattered-token hits rank below but still surface.
    const score = phraseScore * 10 + (allTokensMatch ? tokenSum : 0);
    if (score > 0) scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.en.name.localeCompare(b.item.en.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** All items whose primary destination is the given bin (for bin detail sheets). */
export function getItemsForBin(binId) {
  return ITEMS.filter((item) => item.bin === binId);
}
