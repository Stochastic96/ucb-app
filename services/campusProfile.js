// Campus Radar — self-authored social profile + compact binary wire codec.
//
// The profile is authored entirely in-app (username, real name, status, degree
// program, semester, languages, interests, a DE/INT origin flag). NOTHING is
// read from Stud.IP. On the air it is packed into a tiny signed binary
// "ProfileCard" (well under the 512B GATT MTU): enums travel as 1-byte ids
// (program/language tables are bundled on every device), "open to" flags as a
// single bitmask byte, and interest tags are blinded to per-pair tokens so no
// plaintext preference leaks over open Bluetooth.
//
// PRIVACY INVARIANT: `realName` is a LOCAL-ONLY field. It is deliberately not
// part of the ProfileCard layout, so it can never be broadcast — it travels
// exclusively as a signed payload over the Noise-encrypted DM channel when the
// user explicitly shares it with one peer (services/campusRadar.js shareMyName).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { isValidProgramId } from './campusPrograms';

export const ORIGIN = { DE: 0, INT: 1 };
// v2 added a signed unix timestamp + the sender's transport peer id inside the
// signed body (replay/impersonation protection). v3 adds degree program id,
// semester, an "open to" bitmask and speak/learn language ids — all still
// inside the Ed25519-signed body. Decoders reject other versions outright.
export const CARD_VERSION = 3;

const MAX_NICK = 16; // chars
const MAX_STATUS = 24; // chars
const MAX_INTERESTS = 12;
const MAX_CARD_BYTES = 512;
const MAX_PEER_ID = 64; // bytes (bitchat peer ids are 16 hex chars today)
export const MAX_NAME = 40; // chars — local profile + encrypted name-share only
const MAX_SEMESTER = 20;
export const MAX_LANGS = 3; // per direction (speak / learn)

// Freshness policy for presence cards: reject anything older than 10 minutes
// (radar re-announces far more often) and anything more than 2 minutes in the
// future (clock skew tolerance). Both receive-side checks in validateHello().
export const CARD_MAX_AGE_MS = 10 * 60 * 1000;
export const CARD_MAX_SKEW_MS = 2 * 60 * 1000;

export function isCardFresh(tsSeconds, nowMs = Date.now()) {
  const tsMs = Number(tsSeconds) * 1000;
  if (!Number.isFinite(tsMs) || tsMs <= 0) return false;
  return nowMs - tsMs <= CARD_MAX_AGE_MS && tsMs - nowMs <= CARD_MAX_SKEW_MS;
}

// ── "open to" flags (1 bitmask byte on the wire) ─────────────────────────────
// Bit positions are wire format — append new entries, never reorder.

export const OPEN_TO = [
  { key: 'study', bit: 1, icon: 'book-outline' },
  { key: 'mensa', bit: 2, icon: 'restaurant-outline' },
  { key: 'coffee', bit: 4, icon: 'cafe-outline' },
  { key: 'sports', bit: 8, icon: 'barbell-outline' },
  { key: 'tandem', bit: 16, icon: 'chatbubbles-outline' },
  { key: 'events', bit: 32, icon: 'calendar-outline' },
];

const OPEN_TO_BY_KEY = new Map(OPEN_TO.map((o) => [o.key, o]));

export function openToMask(keys = []) {
  let mask = 0;
  for (const key of keys) mask |= OPEN_TO_BY_KEY.get(key)?.bit ?? 0;
  return mask & 0xff;
}

export function openToKeys(mask = 0) {
  return OPEN_TO.filter((o) => (mask & o.bit) !== 0).map((o) => o.key);
}

// ── language table (1-byte ids on the wire) ──────────────────────────────────
// Ids are wire format — never renumber or reuse. Names render locally per app
// language, only the id travels. Ordered roughly by expected campus frequency.

export const LANGUAGES = [
  { id: 1, code: 'de', en: 'German', de: 'Deutsch' },
  { id: 2, code: 'en', en: 'English', de: 'Englisch' },
  { id: 3, code: 'fr', en: 'French', de: 'Französisch' },
  { id: 4, code: 'es', en: 'Spanish', de: 'Spanisch' },
  { id: 5, code: 'it', en: 'Italian', de: 'Italienisch' },
  { id: 6, code: 'pt', en: 'Portuguese', de: 'Portugiesisch' },
  { id: 7, code: 'nl', en: 'Dutch', de: 'Niederländisch' },
  { id: 8, code: 'pl', en: 'Polish', de: 'Polnisch' },
  { id: 9, code: 'ru', en: 'Russian', de: 'Russisch' },
  { id: 10, code: 'uk', en: 'Ukrainian', de: 'Ukrainisch' },
  { id: 11, code: 'tr', en: 'Turkish', de: 'Türkisch' },
  { id: 12, code: 'ar', en: 'Arabic', de: 'Arabisch' },
  { id: 13, code: 'fa', en: 'Persian', de: 'Persisch' },
  { id: 14, code: 'hi', en: 'Hindi', de: 'Hindi' },
  { id: 15, code: 'ur', en: 'Urdu', de: 'Urdu' },
  { id: 16, code: 'bn', en: 'Bengali', de: 'Bengalisch' },
  { id: 17, code: 'pa', en: 'Punjabi', de: 'Panjabi' },
  { id: 18, code: 'ta', en: 'Tamil', de: 'Tamil' },
  { id: 19, code: 'te', en: 'Telugu', de: 'Telugu' },
  { id: 20, code: 'ne', en: 'Nepali', de: 'Nepalesisch' },
  { id: 21, code: 'si', en: 'Sinhala', de: 'Singhalesisch' },
  { id: 22, code: 'zh', en: 'Chinese', de: 'Chinesisch' },
  { id: 23, code: 'ja', en: 'Japanese', de: 'Japanisch' },
  { id: 24, code: 'ko', en: 'Korean', de: 'Koreanisch' },
  { id: 25, code: 'vi', en: 'Vietnamese', de: 'Vietnamesisch' },
  { id: 26, code: 'id', en: 'Indonesian', de: 'Indonesisch' },
  { id: 27, code: 'th', en: 'Thai', de: 'Thailändisch' },
  { id: 28, code: 'el', en: 'Greek', de: 'Griechisch' },
  { id: 29, code: 'ro', en: 'Romanian', de: 'Rumänisch' },
  { id: 30, code: 'hu', en: 'Hungarian', de: 'Ungarisch' },
  { id: 31, code: 'cs', en: 'Czech', de: 'Tschechisch' },
  { id: 32, code: 'sr', en: 'Serbian', de: 'Serbisch' },
  { id: 33, code: 'hr', en: 'Croatian', de: 'Kroatisch' },
  { id: 34, code: 'bg', en: 'Bulgarian', de: 'Bulgarisch' },
  { id: 35, code: 'sq', en: 'Albanian', de: 'Albanisch' },
  { id: 36, code: 'sw', en: 'Swahili', de: 'Swahili' },
  { id: 37, code: 'am', en: 'Amharic', de: 'Amharisch' },
  { id: 38, code: 'yo', en: 'Yoruba', de: 'Yoruba' },
  { id: 39, code: 'ig', en: 'Igbo', de: 'Igbo' },
  { id: 40, code: 'he', en: 'Hebrew', de: 'Hebräisch' },
];

const LANGUAGE_BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]));

export function languageById(id) {
  return LANGUAGE_BY_ID.get(Number(id)) ?? null;
}

export function getLanguageLabel(id, lang = 'en') {
  const entry = languageById(id);
  if (!entry) return '';
  return (lang === 'de' ? entry.de : entry.en) || entry.en;
}

export function clampLanguageIds(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return Array.from(new Set(list.map(Number))).filter((id) => LANGUAGE_BY_ID.has(id)).slice(0, MAX_LANGS);
}

// Tandem complement between two speak/learn sets. `teach` = languages I speak
// that the peer wants to learn; `learnFrom` = the reverse. A both-ways match is
// a real language-tandem pair; one-way still makes a conversation worth having.
export function tandemMatch(mySpeak = [], myLearn = [], peerSpeak = [], peerLearn = []) {
  const peerLearnSet = new Set(peerLearn.map(Number));
  const peerSpeakSet = new Set(peerSpeak.map(Number));
  const teach = mySpeak.map(Number).filter((id) => peerLearnSet.has(id));
  const learnFrom = myLearn.map(Number).filter((id) => peerSpeakSet.has(id));
  const bothWays = teach.length > 0 && learnFrom.length > 0;
  const oneWay = !bothWays && (teach.length > 0 || learnFrom.length > 0);
  return { teach, learnFrom, bothWays, oneWay };
}

// ── profile persistence (self-authored, no Stud.IP) ──────────────────────────

export function clampProfile(p = {}) {
  const interests = Array.isArray(p.interests) ? p.interests : [];
  const programId = Number(p.programId);
  const semester = Number(p.semester);
  const openTo = Array.isArray(p.openTo) ? p.openTo : [];
  return {
    username: String(p.username ?? '').trim().slice(0, MAX_NICK),
    realName: String(p.realName ?? '').trim().slice(0, MAX_NAME),
    status: String(p.status ?? '').trim().slice(0, MAX_STATUS),
    origin: p.origin === 'INT' ? 'INT' : 'DE',
    interests: dedupeTags(interests).slice(0, MAX_INTERESTS),
    programId: isValidProgramId(programId) ? programId : 0,
    semester: Number.isInteger(semester) && semester >= 1 && semester <= MAX_SEMESTER ? semester : 0,
    openTo: Array.from(new Set(openTo.filter((key) => OPEN_TO_BY_KEY.has(key)))),
    speak: clampLanguageIds(p.speak),
    learn: clampLanguageIds(p.learn),
  };
}

export function isProfileComplete(p) {
  return !!(p && p.username && p.username.trim().length >= 2);
}

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CAMPUS_PROFILE);
    return raw ? clampProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile) {
  const clean = clampProfile(profile);
  await AsyncStorage.setItem(STORAGE_KEYS.CAMPUS_PROFILE, JSON.stringify(clean));
  return clean;
}

// ── tag normalization + blinding ─────────────────────────────────────────────

export function normalizeTag(tag) {
  return String(tag ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function dedupeTags(tags) {
  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
}

// Ephemeral X25519 keypair for a discovery session (rotated on each start).
export function newEphemeralKeyPair() {
  return nacl.box.keyPair();
}

// Symmetric per-pair secret: box.before(peerPub, mySecret) is identical on both
// sides, so both peers derive the same tokens for the same tag.
export function deriveSharedSecret(mySecretKey, peerPublicKey) {
  return nacl.box.before(peerPublicKey, mySecretKey);
}

// Blinded 8-byte token for a tag, comparable ONLY within this pair.
// Keyed hash H(sharedSecret || tag) — an outside sniffer lacks the secret, so it
// cannot precompute the small tag universe. (A connected peer could brute-force a
// tiny tag set; acceptable for a buddy app — upgrade path is ECDH-PSI.)
export function blindToken(tag, sharedSecret) {
  const t = Buffer.from(normalizeTag(tag), 'utf8');
  const input = new Uint8Array(sharedSecret.length + t.length);
  input.set(sharedSecret, 0);
  input.set(t, sharedSecret.length);
  return nacl.hash(input).slice(0, 8);
}

export function blindTokens(tags, sharedSecret) {
  return dedupeTags(tags).map((tag) => blindToken(tag, sharedSecret));
}

// ── binary ProfileCard codec ─────────────────────────────────────────────────
//
// Body layout v3 (all lengths 1 byte, ts is 4-byte big-endian unix seconds):
//   ver | origin | ts[4] | peerIdLen | peerId | ephPub[32] | idPub[32] |
//   nickLen | nick | statusLen | status |
//   programId | semester | openTo |
//   nSpeak | speak[nSpeak] | nLearn | learn[nLearn] |
//   nTokens | token[8]*nTokens
// A 64-byte Ed25519 signature over the body is appended by encodeCard().
// Everything sits INSIDE the signed body, so nothing can be altered without
// invalidating the signature. realName is intentionally NOT representable here.

function pushBytes(arr, bytes) {
  for (let i = 0; i < bytes.length; i++) arr.push(bytes[i]);
}

function pushUint32BE(arr, value) {
  const v = Math.max(0, Math.floor(value)) >>> 0;
  arr.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
}

export function encodeCardBody({
  origin,
  ephPub,
  idPub,
  nick,
  status,
  tokens,
  ts,
  peerId,
  programId = 0,
  semester = 0,
  openTo = 0,
  speak = [],
  learn = [],
}) {
  if (ephPub.length !== 32 || idPub.length !== 32) {
    throw new Error('ephPub/idPub must be 32 bytes');
  }
  const tsSec = Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1000);
  const peerIdBytes = Buffer.from(String(peerId ?? '').slice(0, MAX_PEER_ID), 'utf8');
  const nickBytes = Buffer.from(String(nick ?? '').slice(0, MAX_NICK), 'utf8');
  const statusBytes = Buffer.from(String(status ?? '').slice(0, MAX_STATUS), 'utf8');
  const toks = tokens.slice(0, 255);
  const speakIds = clampLanguageIds(speak);
  const learnIds = clampLanguageIds(learn);

  const out = [];
  out.push(CARD_VERSION);
  out.push(origin === 'INT' || origin === ORIGIN.INT ? ORIGIN.INT : ORIGIN.DE);
  pushUint32BE(out, tsSec);
  out.push(peerIdBytes.length);
  pushBytes(out, peerIdBytes);
  pushBytes(out, ephPub);
  pushBytes(out, idPub);
  out.push(nickBytes.length);
  pushBytes(out, nickBytes);
  out.push(statusBytes.length);
  pushBytes(out, statusBytes);
  out.push(Number(programId) & 0xff);
  out.push(Math.min(Math.max(Number(semester) || 0, 0), MAX_SEMESTER) & 0xff);
  out.push(Number(openTo) & 0xff);
  out.push(speakIds.length);
  pushBytes(out, speakIds);
  out.push(learnIds.length);
  pushBytes(out, learnIds);
  out.push(toks.length);
  for (const tk of toks) pushBytes(out, tk.slice(0, 8));
  return Uint8Array.from(out);
}

// Append the signature. Guards the GATT MTU budget.
export function encodeCard(body, signature) {
  const full = new Uint8Array(body.length + signature.length);
  full.set(body, 0);
  full.set(signature, body.length);
  if (full.length > MAX_CARD_BYTES) {
    throw new Error(`ProfileCard ${full.length}B exceeds ${MAX_CARD_BYTES}B MTU budget`);
  }
  return full;
}

// Throws on unknown versions and on truncated/malformed input — every length
// is bounds-checked before reading so a hostile packet can never over-read.
export function decodeCard(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let o = 0;
  const need = (n) => {
    if (o + n > b.length) throw new Error('CARD_TRUNCATED');
  };

  need(2);
  const version = b[o++];
  if (version !== CARD_VERSION) throw new Error('UNSUPPORTED_CARD_VERSION');
  const origin = b[o++] === ORIGIN.INT ? 'INT' : 'DE';

  need(4);
  const ts = ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  o += 4;

  need(1);
  const peerIdLen = b[o++];
  need(peerIdLen);
  const peerId = Buffer.from(b.slice(o, o + peerIdLen)).toString('utf8');
  o += peerIdLen;

  need(64);
  const ephPub = b.slice(o, o + 32);
  o += 32;
  const idPub = b.slice(o, o + 32);
  o += 32;

  need(1);
  const nickLen = b[o++];
  need(nickLen);
  const nick = Buffer.from(b.slice(o, o + nickLen)).toString('utf8');
  o += nickLen;

  need(1);
  const statusLen = b[o++];
  need(statusLen);
  const status = Buffer.from(b.slice(o, o + statusLen)).toString('utf8');
  o += statusLen;

  need(3);
  const programId = b[o++];
  const semester = b[o++];
  const openTo = b[o++];

  need(1);
  const nSpeak = b[o++];
  need(nSpeak);
  const speak = Array.from(b.slice(o, o + nSpeak));
  o += nSpeak;

  need(1);
  const nLearn = b[o++];
  need(nLearn);
  const learn = Array.from(b.slice(o, o + nLearn));
  o += nLearn;

  need(1);
  const nTokens = b[o++];
  need(nTokens * 8);
  const tokens = [];
  for (let i = 0; i < nTokens; i++) {
    tokens.push(b.slice(o, o + 8));
    o += 8;
  }

  const bodyLen = o;
  need(64);
  const signature = b.slice(o, o + 64);
  return {
    version,
    origin,
    ts,
    peerId,
    ephPub,
    idPub,
    nick,
    status,
    programId,
    semester,
    openTo,
    speak,
    learn,
    tokens,
    signature,
    body: b.slice(0, bodyLen),
  };
}

// ── local match evaluation ───────────────────────────────────────────────────

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

// Count shared interests by intersecting blinded token sets.
export function sharedTokenCount(myTokens, peerTokens) {
  const set = new Set(peerTokens.map(hex));
  return myTokens.reduce((n, tk) => n + (set.has(hex(tk)) ? 1 : 0), 0);
}

// Score = shared interests (2) + DE↔INT buddy complement (3) + language tandem
// (4 both ways / 2 one way) + same degree program (3) + same semester (1).
// `mine`/`peer` are optional { programId, semester, speak, learn } — omitted
// fields simply contribute nothing, keeping v2-era callers valid.
export function scoreMatch({ myTokens, peerTokens, myOrigin, peerOrigin, mine, peer }) {
  const shared = sharedTokenCount(myTokens, peerTokens);
  const originComplement = myOrigin !== peerOrigin ? 1 : 0;
  const tandem = tandemMatch(mine?.speak, mine?.learn, peer?.speak, peer?.learn);
  // Program 0 = unset and 255 = "other" — neither is a meaningful match signal.
  const comparableProgram =
    Number(mine?.programId) > 0 && Number(mine?.programId) < 255 && Number(mine?.programId) === Number(peer?.programId);
  const sameSemester = Number(mine?.semester) > 0 && Number(mine?.semester) === Number(peer?.semester);
  const score =
    shared * 2 +
    originComplement * 3 +
    (tandem.bothWays ? 4 : tandem.oneWay ? 2 : 0) +
    (comparableProgram ? 3 : 0) +
    (sameSemester ? 1 : 0);
  return {
    score,
    sharedCount: shared,
    buddyMatch: originComplement === 1,
    tandem: tandem.bothWays ? 'both' : tandem.oneWay ? 'one' : null,
    sameProgram: comparableProgram,
    sameSemester,
  };
}
