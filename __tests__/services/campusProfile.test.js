import nacl from 'tweetnacl';
import {
  CARD_VERSION,
  CARD_MAX_AGE_MS,
  CARD_MAX_SKEW_MS,
  isCardFresh,
  clampProfile,
  isProfileComplete,
  saveProfile,
  loadProfile,
  normalizeTag,
  newEphemeralKeyPair,
  deriveSharedSecret,
  blindToken,
  blindTokens,
  encodeCardBody,
  encodeCard,
  decodeCard,
  sharedTokenCount,
  scoreMatch,
  openToMask,
  openToKeys,
  clampLanguageIds,
  tandemMatch,
} from '../../services/campusProfile';
import { verify } from '../../services/campusIdentity';

describe('campusProfile — persistence & validation', () => {
  it('clamps username/status length, origin, and interest count', () => {
    const p = clampProfile({
      username: 'this-username-is-way-too-long',
      status: 'x'.repeat(50),
      origin: 'XX',
      interests: Array.from({ length: 30 }, (_, i) => `tag${i}`),
    });
    expect(p.username.length).toBeLessThanOrEqual(16);
    expect(p.status.length).toBeLessThanOrEqual(24);
    expect(p.origin).toBe('DE'); // invalid → default
    expect(p.interests.length).toBeLessThanOrEqual(12);
  });

  it('dedupes and normalizes interests', () => {
    const p = clampProfile({ username: 'a', interests: ['Coffee', 'coffee ', 'MUSIC'] });
    expect(p.interests).toEqual(['coffee', 'music']);
  });

  it('isProfileComplete requires a username', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete({ username: 'a' })).toBe(false); // too short
    expect(isProfileComplete({ username: 'GreenFox' })).toBe(true);
  });

  it('save then load round-trips a cleaned profile (v3 fields defaulted)', async () => {
    await saveProfile({ username: 'GreenFox', status: 'looking for buddies', origin: 'INT', interests: ['coding'] });
    const loaded = await loadProfile();
    expect(loaded).toEqual({
      username: 'GreenFox',
      realName: '',
      status: 'looking for buddies',
      origin: 'INT',
      interests: ['coding'],
      programId: 0,
      semester: 0,
      openTo: [],
      speak: [],
      learn: [],
    });
  });
});

describe('campusProfile — v3 fields (program / semester / openTo / languages / realName)', () => {
  it('clamps invalid v3 values back to unset', () => {
    const p = clampProfile({
      username: 'a1',
      realName: ` Anna Schmidt ${'x'.repeat(60)}`,
      programId: 999, // not in campus_programs.json
      semester: 42, // out of range
      openTo: ['study', 'nope', 'study', 'tandem'],
      speak: [1, 1, 2, 3, 4, 99],
      learn: [2],
    });
    expect(p.realName.length).toBeLessThanOrEqual(40);
    expect(p.programId).toBe(0);
    expect(p.semester).toBe(0);
    expect(p.openTo).toEqual(['study', 'tandem']);
    expect(p.speak).toEqual([1, 2, 3]); // deduped, valid ids only, max 3
    expect(p.learn).toEqual([2]);
  });

  it('keeps valid program ids and semesters', () => {
    const p = clampProfile({ username: 'ab', programId: 24, semester: 3 });
    expect(p.programId).toBe(24); // IMAT
    expect(p.semester).toBe(3);
  });

  it('openTo bitmask round-trips and ignores unknown keys', () => {
    const mask = openToMask(['study', 'coffee', 'tandem']);
    expect(openToKeys(mask)).toEqual(['study', 'coffee', 'tandem']);
    expect(openToKeys(0)).toEqual([]);
    expect(openToMask(['bogus'])).toBe(0);
  });

  it('clampLanguageIds drops unknown ids and caps at 3', () => {
    expect(clampLanguageIds([2, 2, 1, 250, 3, 4])).toEqual([2, 1, 3]);
    expect(clampLanguageIds(undefined)).toEqual([]);
  });

  it('tandemMatch detects both-ways and one-way complements', () => {
    expect(tandemMatch([1], [2], [2], [1]).bothWays).toBe(true); // de↔en swap
    const one = tandemMatch([1], [], [9], [1]); // I speak de, they want to learn de
    expect(one.bothWays).toBe(false);
    expect(one.oneWay).toBe(true);
    expect(tandemMatch([3], [4], [5], [6]).oneWay).toBe(false);
  });

  it('scoreMatch adds tandem/program/semester weights without breaking v2-style calls', () => {
    const a = newEphemeralKeyPair();
    const b = newEphemeralKeyPair();
    const shared = deriveSharedSecret(a.secretKey, b.publicKey);
    const myTokens = blindTokens(['coffee'], shared);
    const peerTokens = blindTokens(['coffee'], shared);

    const base = scoreMatch({ myTokens, peerTokens, myOrigin: 'DE', peerOrigin: 'INT' });
    expect(base.score).toBe(1 * 2 + 3); // unchanged v2 arithmetic
    expect(base.tandem).toBeNull();

    const rich = scoreMatch({
      myTokens,
      peerTokens,
      myOrigin: 'DE',
      peerOrigin: 'INT',
      mine: { programId: 24, semester: 1, speak: [1], learn: [2] },
      peer: { programId: 24, semester: 1, speak: [2], learn: [1] },
    });
    // shared 2 + origin 3 + both-ways tandem 4 + same program 3 + same semester 1
    expect(rich.score).toBe(13);
    expect(rich.tandem).toBe('both');
    expect(rich.sameProgram).toBe(true);
    expect(rich.sameSemester).toBe(true);
  });

  it('unset (0) and "other" (255) programs never count as same-program', () => {
    const args = { myTokens: [], peerTokens: [], myOrigin: 'DE', peerOrigin: 'DE' };
    expect(scoreMatch({ ...args, mine: { programId: 0 }, peer: { programId: 0 } }).sameProgram).toBe(false);
    expect(scoreMatch({ ...args, mine: { programId: 255 }, peer: { programId: 255 } }).sameProgram).toBe(false);
  });

  it('round-trips the v3 wire fields through the binary codec', () => {
    const idKey = nacl.sign.keyPair();
    const eph = newEphemeralKeyPair();
    const body = encodeCardBody({
      origin: 'INT',
      ts: 1_800_000_000,
      peerId: 'a1b2c3d4e5f60718',
      ephPub: eph.publicKey,
      idPub: idKey.publicKey,
      nick: 'Layla',
      status: 'hi',
      tokens: [],
      programId: 24,
      semester: 2,
      openTo: openToMask(['tandem', 'events']),
      speak: [2, 12],
      learn: [1],
    });
    const decoded = decodeCard(encodeCard(body, nacl.sign.detached(body, idKey.secretKey)));
    expect(decoded.version).toBe(CARD_VERSION);
    expect(decoded.programId).toBe(24);
    expect(decoded.semester).toBe(2);
    expect(openToKeys(decoded.openTo)).toEqual(['tandem', 'events']);
    expect(decoded.speak).toEqual([2, 12]);
    expect(decoded.learn).toEqual([1]);
    expect(verify(decoded.body, decoded.signature, decoded.idPub)).toBe(true);
  });
});

describe('campusProfile — blinded token matching', () => {
  it('derives the same token on both sides of a pair (ECDH symmetry)', () => {
    const a = newEphemeralKeyPair();
    const b = newEphemeralKeyPair();
    const sA = deriveSharedSecret(a.secretKey, b.publicKey);
    const sB = deriveSharedSecret(b.secretKey, a.publicKey);
    const tA = blindToken('coffee', sA);
    const tB = blindToken('coffee', sB);
    expect(Buffer.from(tA).toString('hex')).toBe(Buffer.from(tB).toString('hex'));
    expect(tA).toHaveLength(8);
  });

  it('different pairs produce non-comparable tokens (no global precompute)', () => {
    const a = newEphemeralKeyPair();
    const b = newEphemeralKeyPair();
    const c = newEphemeralKeyPair();
    const sAB = deriveSharedSecret(a.secretKey, b.publicKey);
    const sAC = deriveSharedSecret(a.secretKey, c.publicKey);
    expect(Buffer.from(blindToken('coffee', sAB)).toString('hex')).not.toBe(
      Buffer.from(blindToken('coffee', sAC)).toString('hex')
    );
  });

  it('counts shared interests and scores a DE↔INT buddy match', () => {
    const a = newEphemeralKeyPair();
    const b = newEphemeralKeyPair();
    const shared = deriveSharedSecret(a.secretKey, b.publicKey);
    const myTokens = blindTokens(['coffee', 'football', 'music'], shared);
    const peerTokens = blindTokens(['coffee', 'music', 'coding'], shared);
    expect(sharedTokenCount(myTokens, peerTokens)).toBe(2);
    const res = scoreMatch({ myTokens, peerTokens, myOrigin: 'DE', peerOrigin: 'INT' });
    expect(res.sharedCount).toBe(2);
    expect(res.buddyMatch).toBe(true);
    expect(res.score).toBe(2 * 2 + 3);
  });
});

describe('campusProfile — binary card codec', () => {
  it('round-trips a signed card and verifies the signature', () => {
    const idKey = nacl.sign.keyPair();
    const eph = newEphemeralKeyPair();
    const shared = deriveSharedSecret(eph.secretKey, newEphemeralKeyPair().publicKey);
    const tokens = blindTokens(['coffee', 'hiking'], shared);

    const body = encodeCardBody({
      origin: 'INT',
      ephPub: eph.publicKey,
      idPub: idKey.publicKey,
      nick: 'GreenFox',
      status: 'new here 👋',
      tokens,
    });
    const sig = nacl.sign.detached(body, idKey.secretKey);
    const card = encodeCard(body, sig);

    const decoded = decodeCard(card);
    expect(decoded.nick).toBe('GreenFox');
    expect(decoded.status).toBe('new here 👋');
    expect(decoded.origin).toBe('INT');
    expect(decoded.tokens).toHaveLength(2);
    expect(verify(decoded.body, decoded.signature, decoded.idPub)).toBe(true);
  });

  it('stays under the 512B GATT MTU budget with a full profile', () => {
    const idKey = nacl.sign.keyPair();
    const eph = newEphemeralKeyPair();
    const shared = deriveSharedSecret(eph.secretKey, newEphemeralKeyPair().publicKey);
    const tokens = blindTokens(
      Array.from({ length: 12 }, (_, i) => `interest${i}`),
      shared
    );
    const body = encodeCardBody({
      origin: 'DE',
      peerId: 'f'.repeat(64), // worst-case transport peer id
      ephPub: eph.publicKey,
      idPub: idKey.publicKey,
      nick: 'x'.repeat(16),
      status: 'y'.repeat(24),
      tokens,
      programId: 255,
      semester: 20,
      openTo: 0xff,
      speak: [1, 2, 3], // max per direction
      learn: [4, 5, 6],
    });
    const card = encodeCard(body, nacl.sign.detached(body, idKey.secretKey));
    expect(card.length).toBeLessThanOrEqual(512);
  });

  it('normalizeTag lowercases and collapses whitespace', () => {
    expect(normalizeTag('  Coffee   Lover ')).toBe('coffee lover');
  });
});

describe('campusProfile — card v2 replay/impersonation fields', () => {
  const makeCard = (over = {}) => {
    const idKey = nacl.sign.keyPair();
    const eph = newEphemeralKeyPair();
    const body = encodeCardBody({
      origin: 'DE',
      ts: 1_750_000_000,
      peerId: 'a1b2c3d4e5f60718',
      ephPub: eph.publicKey,
      idPub: idKey.publicKey,
      nick: 'GreenFox',
      status: 'hi',
      tokens: [],
      ...over,
    });
    return encodeCard(body, nacl.sign.detached(body, idKey.secretKey));
  };

  it('round-trips the signed timestamp and transport peer id', () => {
    const decoded = decodeCard(makeCard());
    expect(decoded.version).toBe(CARD_VERSION);
    expect(decoded.ts).toBe(1_750_000_000);
    expect(decoded.peerId).toBe('a1b2c3d4e5f60718');
  });

  it('rejects cards with an unsupported version byte', () => {
    const card = makeCard();
    card[0] = 1; // downgrade to the retired v1 layout
    expect(() => decodeCard(card)).toThrow('UNSUPPORTED_CARD_VERSION');
  });

  it('rejects truncated cards instead of over-reading', () => {
    const card = makeCard();
    expect(() => decodeCard(card.slice(0, 40))).toThrow('CARD_TRUNCATED');
    expect(() => decodeCard(card.slice(0, card.length - 70))).toThrow('CARD_TRUNCATED');
  });

  it('isCardFresh accepts recent cards and small clock skew only', () => {
    const now = Date.now();
    const sec = (ms) => Math.floor(ms / 1000);
    expect(isCardFresh(sec(now), now)).toBe(true);
    expect(isCardFresh(sec(now - CARD_MAX_AGE_MS + 5000), now)).toBe(true);
    expect(isCardFresh(sec(now - CARD_MAX_AGE_MS - 60_000), now)).toBe(false); // stale replay
    expect(isCardFresh(sec(now + CARD_MAX_SKEW_MS + 60_000), now)).toBe(false); // future-dated
    expect(isCardFresh(0, now)).toBe(false);
    expect(isCardFresh(NaN, now)).toBe(false);
  });
});
