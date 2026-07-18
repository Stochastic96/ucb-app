import {
  getAllBins,
  getAllWasteItems,
  getBinById,
  getBinCopy,
  getItemsForBin,
  getWasteItemById,
  getWasteItemCopy,
  getVariantLabel,
  normalizeWasteToken,
  searchWasteItems,
} from '../../services/waste';

describe('waste data integrity', () => {
  const binIds = new Set(getAllBins().map((bin) => bin.id));

  it('has bins with complete bilingual copy', () => {
    for (const bin of getAllBins()) {
      expect(bin.id).toBeTruthy();
      expect(bin.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      for (const lang of ['en', 'de']) {
        expect(bin[lang].name).toBeTruthy();
        expect(bin[lang].tagline).toBeTruthy();
        expect(bin[lang].belongs.length).toBeGreaterThan(0);
        expect(bin[lang].never.length).toBeGreaterThan(0);
        expect(bin[lang].howto).toBeTruthy();
      }
    }
  });

  it('has unique item ids', () => {
    const ids = getAllWasteItems().map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every item (and variant) at an existing bin', () => {
    for (const item of getAllWasteItems()) {
      expect(binIds.has(item.bin)).toBe(true);
      for (const variant of item.variants ?? []) {
        expect(binIds.has(variant.bin)).toBe(true);
      }
    }
  });

  it('has bilingual name and why on every item', () => {
    for (const item of getAllWasteItems()) {
      expect(item.en.name).toBeTruthy();
      expect(item.de.name).toBeTruthy();
      expect(item.en.why).toBeTruthy();
      expect(item.de.why).toBeTruthy();
    }
  });
});

describe('normalizeWasteToken', () => {
  it('folds umlauts and ß', () => {
    expect(normalizeWasteToken('Glühbirne')).toBe('gluhbirne');
    expect(normalizeWasteToken('STRASSE straße')).toBe('strasse strasse');
  });

  it('trims and collapses whitespace', () => {
    expect(normalizeWasteToken('  pizza   box  ')).toBe('pizza box');
  });

  it('handles null/undefined', () => {
    expect(normalizeWasteToken(null)).toBe('');
    expect(normalizeWasteToken(undefined)).toBe('');
  });
});

describe('searchWasteItems', () => {
  it('returns [] for an empty query', () => {
    expect(searchWasteItems('')).toEqual([]);
    expect(searchWasteItems('   ')).toEqual([]);
  });

  it('finds items by English name', () => {
    const results = searchWasteItems('pizza box');
    expect(results[0].id).toBe('pizza_box');
  });

  it('finds items by German name regardless of app language', () => {
    const results = searchWasteItems('Pizzakarton');
    expect(results[0].id).toBe('pizza_box');
  });

  it('finds items by alias', () => {
    const results = searchWasteItems('tetra pak');
    expect(results.map((item) => item.id)).toContain('milk_carton');
  });

  it('is umlaut-insensitive (gluhbirne finds Glühbirne)', () => {
    const results = searchWasteItems('gluhbirne');
    expect(results.map((item) => item.id)).toContain('incandescent_bulb');
  });

  it('ranks exact matches first', () => {
    const results = searchWasteItems('beer bottle');
    expect(results[0].id).toBe('beer_bottle');
  });

  it('matches partial prefixes while typing', () => {
    const results = searchWasteItems('pizz');
    expect(results.map((item) => item.id)).toContain('pizza_box');
  });

  it('respects the limit', () => {
    expect(searchWasteItems('a', 5).length).toBeLessThanOrEqual(5);
  });

  it('every alias of every item is findable', () => {
    for (const item of getAllWasteItems()) {
      for (const alias of [...(item.en.aliases ?? []), ...(item.de.aliases ?? [])]) {
        const results = searchWasteItems(alias, 122);
        expect(results.map((r) => r.id)).toContain(item.id);
      }
    }
  });
});

describe('bin and item accessors', () => {
  it('getBinById resolves known bins and rejects unknown', () => {
    expect(getBinById('pfand').id).toBe('pfand');
    expect(getBinById('nope')).toBeNull();
  });

  it('getWasteItemById resolves items', () => {
    expect(getWasteItemById('batteries').bin).toBe('sondermuell');
    expect(getWasteItemById('nope')).toBeNull();
  });

  it('getItemsForBin returns only items of that bin', () => {
    const items = getItemsForBin('pfand');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.bin === 'pfand')).toBe(true);
  });

  it('language copy falls back to English for unknown languages', () => {
    const item = getWasteItemById('pizza_box');
    expect(getWasteItemCopy(item, 'de').name).toBe('Pizzakarton');
    expect(getWasteItemCopy(item, 'fr').name).toBe('Pizza box');
    expect(getWasteItemCopy(null).name).toBe('');

    const bin = getBinById('bio');
    expect(getBinCopy(bin, 'de').name).toBe('Biotonne');
    expect(getBinCopy(bin, 'fr').name).toBe('Organic Bin');
  });

  it('variant labels resolve per language with fallback', () => {
    const item = getWasteItemById('pizza_box');
    expect(getVariantLabel(item.variants[0], 'de')).toBe('Saubere Teile');
    expect(getVariantLabel(item.variants[0], 'fr')).toBe('Clean parts');
    expect(getVariantLabel(null)).toBe('');
  });
});
