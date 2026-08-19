// Campus Radar — serverless Bluetooth-mesh transport wrapper.
//
// Wraps `react-native-mesh-sdk` (the maintained RN port of the current bitchat
// native cores: BLE mesh, Noise XX transport encryption, GCS gossip sync)
// behind a guarded require (probe NativeModules before requiring the SDK).
// `bleAvailable` is decided ONCE at module load; when the native module is
// absent (Expo Go / simulator / Jest) the whole feature runs in MOCK mode with
// synthetic nearby peers so the UI is fully demoable.
//
// This module is the single source of truth for radar state — it writes peers
// and messages straight into the Zustand store; screens just read the store.
//
// App-layer security on top of the transport (see validateHello/handleProof):
//  - Presence cards carry a signed timestamp + the sender's transport peer id
//    INSIDE the Ed25519-signed body → stale replays and cards re-broadcast
//    from a different device are rejected on receipt.
//  - An identity proof exchanged over the Noise-encrypted DM channel binds the
//    app-level Ed25519 identity to the live encrypted session (peer.proven).
//  - Per-peer ingest rate limiting caps message floods.

import { Buffer } from 'buffer';
import useStore from '../store/useStore';
import * as logger from './logger';
import { getIdentity, sign, verify, fingerprintOf, toB64, fromB64 } from './campusIdentity';
import {
  CARD_VERSION,
  MAX_NAME,
  isCardFresh,
  newEphemeralKeyPair,
  deriveSharedSecret,
  blindTokens,
  scoreMatch,
  openToMask,
  openToKeys,
  encodeCardBody,
  encodeCard,
  decodeCard,
} from './campusProfile';

export const ROOM_THREAD = 'room';

const HELLO_PREFIX = '__ucb_hello__:';
const PROOF_PREFIX = '__ucb_proof__:';
// Wave: a one-tap 👋 (low-pressure icebreaker), DM channel only.
const WAVE_PREFIX = '__ucb_wave__:';
// Name share: the user's real name, signed and sent over the Noise-encrypted
// DM channel to ONE peer. Never part of the broadcast presence card.
const NAME_PREFIX = '__ucb_name__:';

// Private campus mesh identity — distinct UUIDs so UCB devices form their own
// network and never mingle with the public bitchat mesh. Same pair on every
// install; changing them is a breaking network split.
const MESH_SERVICE_UUID = '8e0c9d6a-3f52-4e6b-9a1d-77c4b1e0a9f2';
const MESH_CHARACTERISTIC_UUID = '8e0c9d6b-3f52-4e6b-9a1d-77c4b1e0a9f3';

const ANNOUNCE_MIN_INTERVAL_MS = 30 * 1000; // throttle presence re-broadcasts
const ANNOUNCE_PERIOD_MS = 60 * 1000; // periodic re-announce while radar is on
const PROOF_MAX_AGE_MS = 5 * 60 * 1000; // identity-proof freshness window
const PEER_LINGER_MS = 3 * 60 * 1000; // keep vanished peers greyed this long
const MSG_WINDOW_MS = 10 * 1000; // ingest rate limit window…
const MSG_WINDOW_MAX = 10; // …max messages per peer inside it
const SEEN_CARDS_MAX = 200; // relay-duplicate LRU size

// ── native module guard (decided once at module load) ────────────────────────
// Probe NativeModules BEFORE requiring the SDK: its JS facade constructs a
// NativeEventEmitter at import time, which throws when the module is missing.
let Mesh = null;
let bleAvailable = false;
try {
  const { NativeModules } = require('react-native');
  if (NativeModules && NativeModules.MeshSdk) {
    Mesh = require('react-native-mesh-sdk').MeshSdk;
    bleAvailable = !!Mesh && typeof Mesh.startServices === 'function';
  }
} catch (e) {
  // Silent fallback to MOCK mode (Expo Go / simulator / not installed).
}

export function isBleAvailable() {
  return bleAvailable;
}

// ── session state ────────────────────────────────────────────────────────────
// { ephKeyPair, identity, profile, subscriptions[], timers[], myPeerId,
//   announcedAt, provenTo:Set, seenCards:Map, msgLog:Map,
//   readReceipted:Set (incoming DM ids we already sent read receipts for),
//   blockedPeerIds:Set (transport ids known to belong to blocked identities —
//     closes the hole where a blocked user's ROOM messages would still render
//     because their peer entry was dropped at ingest and the fingerprint check
//     therefore had nothing to match against) }
let _session = null;

function store() {
  return useStore.getState();
}

// ── app-layer packet validation (pure, unit-tested) ─────────────────────────

// Receive-side guards for a decoded presence card:
//  version   — codec already enforces, re-checked for defense in depth
//  signature — Ed25519 over the body (nick/status/tokens/ts/peerId immutable)
//  freshness — signed timestamp inside [now - CARD_MAX_AGE, now + skew]
//  binding   — signed peerId must match the transport-level sender, so a card
//              captured from Alice cannot be re-broadcast by Mallory's device
export function validateHello(decoded, { senderPeerId = null, now = Date.now() } = {}) {
  if (!decoded) return { ok: false, reason: 'empty' };
  if (decoded.version !== CARD_VERSION) return { ok: false, reason: 'version' };
  if (!verify(decoded.body, decoded.signature, decoded.idPub)) {
    return { ok: false, reason: 'signature' };
  }
  if (!isCardFresh(decoded.ts, now)) return { ok: false, reason: 'stale' };
  if (!decoded.peerId) return { ok: false, reason: 'unbound' };
  if (senderPeerId && decoded.peerId !== senderPeerId) {
    return { ok: false, reason: 'peer-mismatch' };
  }
  return { ok: true };
}

// Build our signed presence card (no tokens — those are pairwise, sent per-peer).
async function buildPresenceHeader() {
  const { ephKeyPair, identity, profile, myPeerId } = _session;
  const body = encodeCardBody({
    origin: profile.origin,
    ts: Math.floor(Date.now() / 1000),
    peerId: myPeerId,
    ephPub: ephKeyPair.publicKey,
    idPub: identity.publicKey,
    nick: profile.username,
    status: profile.status,
    programId: profile.programId ?? 0,
    semester: profile.semester ?? 0,
    openTo: openToMask(profile.openTo),
    speak: profile.speak ?? [],
    learn: profile.learn ?? [],
    tokens: [], // header carries no interest tokens
  });
  const sig = await sign(body);
  return toB64(encodeCard(body, sig));
}

// Evaluate a validated peer card against our profile → match metadata.
// Sticky per-relationship state (proven, shared names, link telemetry) is
// carried over from the previous peer entry on re-announces — but ONLY while
// the identity fingerprint is unchanged; a new identity on the same transport
// id starts from zero trust again.
function evaluatePeer(decoded, peerId) {
  const { ephKeyPair, profile } = _session;
  const fingerprint = fingerprintOf(decoded.idPub);
  const shared = deriveSharedSecret(ephKeyPair.secretKey, decoded.ephPub);
  const myTokens = blindTokens(profile.interests, shared);
  const { score, sharedCount, buddyMatch, tandem, sameProgram, sameSemester } = scoreMatch({
    myTokens,
    peerTokens: decoded.tokens,
    myOrigin: profile.origin,
    peerOrigin: decoded.origin,
    mine: profile,
    peer: decoded,
  });
  const prev = store().radarPeers.find((p) => p.peerId === peerId);
  const sticky =
    prev && prev.fingerprint === fingerprint
      ? {
          proven: !!prev.proven,
          realName: prev.realName ?? null,
          myNameShared: !!prev.myNameShared,
          rssi: prev.rssi ?? null,
        }
      : {};
  return {
    peerId,
    fingerprint,
    nick: decoded.nick,
    status: decoded.status,
    origin: decoded.origin,
    programId: decoded.programId ?? 0,
    semester: decoded.semester ?? 0,
    openTo: openToKeys(decoded.openTo ?? 0),
    speak: decoded.speak ?? [],
    learn: decoded.learn ?? [],
    score,
    sharedCount,
    buddyMatch,
    tandem,
    sameProgram,
    sameSemester,
    verified: true, // card signature checked in validateHello
    proven: false, // flips true after the encrypted identity proof
    realName: null, // filled only if the peer explicitly shares it (encrypted DM)
    myNameShared: false, // we shared our name with them
    connected: true,
    rssi: null,
    lastSeen: Date.now(),
    ...sticky,
  };
}

function ingestPeer(peer) {
  if (store().blockedPeers.includes(peer.fingerprint)) {
    // Remember the transport id so this identity's ROOM messages are dropped
    // too — the peer entry itself never enters the store.
    registerBlockedPeerId(peer.peerId);
    return;
  }
  store().upsertRadarPeer(peer);
}

// Record a transport peer id as blocked for this session. Called on block from
// the chat screen and whenever a blocked identity announces itself.
export function registerBlockedPeerId(peerId) {
  if (_session && peerId) _session.blockedPeerIds.add(String(peerId));
}

// ── Android runtime permissions ──────────────────────────────────────────────
// The vendored bitchat core checks for fine location on ALL API levels (BLE
// scan requirement) plus the API 31+ Bluetooth runtime permissions. GPS is
// never read — the permission is a BLE-scan technicality (disclosed in the
// Datenschutzerklärung).
async function requestNativePermissions() {
  const { Platform, PermissionsAndroid } = require('react-native');
  if (Platform.OS !== 'android') return true; // iOS prompts via Info.plist strings
  const wanted = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
  ].filter(Boolean);
  const results = await PermissionsAndroid.requestMultiple(wanted);
  return Object.values(results).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

// ── public API ───────────────────────────────────────────────────────────────

export async function startRadar() {
  if (_session) return; // already running
  const profile = store().campusProfile;
  if (!profile || !profile.username) {
    throw new Error('PROFILE_REQUIRED');
  }
  const identity = await getIdentity();
  _session = {
    ephKeyPair: newEphemeralKeyPair(),
    identity,
    profile,
    subscriptions: [],
    timers: [],
    myPeerId: '',
    announcedAt: 0,
    provenTo: new Set(),
    seenCards: new Map(),
    msgLog: new Map(),
    readReceipted: new Set(),
    blockedPeerIds: new Set(),
  };

  if (bleAvailable) {
    try {
      const granted = await requestNativePermissions();
      if (!granted) {
        _session = null;
        throw new Error('PERMISSIONS_DENIED');
      }
      await Mesh.setMeshId(MESH_SERVICE_UUID, MESH_CHARACTERISTIC_UUID);
      await Mesh.setNickname(profile.username);
      // The app owns notifications (expo-notifications); silence the SDK's.
      await Mesh.setNotificationsEnabled(false).catch(() => {});
      await Mesh.setPublicNotificationsEnabled(false).catch(() => {});
      await Mesh.startServices();
      _session.myPeerId = String((await Mesh.getMyPeerID().catch(() => '')) ?? '');

      _session.subscriptions.push(
        Mesh.onMessage((m) => onNativeMessage(m)),
        Mesh.onPeerSnapshotsUpdate((peers) => onPeerSnapshots(peers)),
        Mesh.addListener('onPeerDisconnected', ({ peerID }) => onPeerGone(peerID)),
        Mesh.addListener('onBluetoothStateChange', ({ state }) => {
          store().setRadarBtState(state);
        }),
        // Delivery ladder for our outgoing DMs: sent (local) → delivered (ack)
        // → read (receipt). Ids correlate because _send passes our local
        // message id into Mesh.sendPrivateMessage.
        Mesh.addListener('onDeliveryAck', ({ messageID, recipientPeerID }) =>
          updateMessageStatus(String(recipientPeerID ?? ''), String(messageID ?? ''), 'delivered')
        ),
        Mesh.addListener('onReadReceipt', ({ messageID, recipientPeerID }) =>
          updateMessageStatus(String(recipientPeerID ?? ''), String(messageID ?? ''), 'read')
        ),
        Mesh.addListener('onDeliveryStatusUpdate', ({ messageID, status }) =>
          onDeliveryStatusUpdate(String(messageID ?? ''), status)
        )
      );
      _session.timers.push(setInterval(() => announcePresence(), ANNOUNCE_PERIOD_MS));

      store().setRadarEnabled(true);
      await announcePresence(true);
      logger.info('CampusRadar', 'Started (native BLE mesh)', { myPeerId: _session.myPeerId });
    } catch (err) {
      if (err?.message === 'PERMISSIONS_DENIED') throw err; // surfaced to the screen
      // On a real device a native failure must NEVER fall back to mock mode —
      // synthetic peers would look like real students. Clean up and surface it.
      logger.error('CampusRadar', 'Native start failed', err);
      await stopRadar();
      throw new Error('RADAR_START_FAILED');
    }
  } else {
    // Mock mode exists ONLY where the native module itself is absent
    // (Expo Go / simulator / Jest) — it is a demo, never a device fallback.
    store().setRadarEnabled(true);
    startMock();
  }
}

export async function stopRadar() {
  if (!_session) return;
  _session.timers.forEach((t) => {
    clearTimeout(t);
    clearInterval(t);
  });
  _session.subscriptions.forEach((s) => {
    try {
      s?.remove?.();
    } catch {}
  });
  if (bleAvailable) {
    try {
      await Mesh.stopServices();
    } catch {}
  }
  _session = null;
  store().setRadarEnabled(false);
  store().setRadarBtState(null);
  store().clearRadarPeers();
}

// Live ghost-mode toggle. Turning Visible triggers an immediate presence
// announce so nearby peers see us without waiting for the next period; turning
// Ghost simply stops future announces (our last card ages out on peers).
export async function setGhostMode(on) {
  store().setRadarGhost(!!on);
  if (!on && _session && bleAvailable) {
    await announcePresence(true);
  }
}

export async function sendRoomMessage(text) {
  return _send(ROOM_THREAD, text);
}

export async function sendPrivateMessage(peerId, text) {
  return _send(peerId, text);
}

function newMsgId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// One-tap 👋 to a nearby peer — a far lower-pressure icebreaker than composing
// a first DM. Travels over the encrypted DM channel; receive side is
// rate-limited like any message so it cannot be used to spam.
export async function sendWave(peerId) {
  if (!_session) return;
  if (store().radarGhost) return; // hidden users never transmit
  const peer = store().radarPeers.find((p) => p.peerId === peerId);
  if (!peer) return;
  const { identity, profile } = _session;
  store().appendChatMessage(peerId, {
    id: newMsgId(),
    kind: 'wave',
    fingerprint: identity.fingerprint,
    nick: profile.username,
    text: '👋',
    ts: Date.now(),
    mine: true,
    verified: true,
  });
  if (bleAvailable) {
    try {
      await maybeSendProof(peerId);
      const payload = toB64(new Uint8Array(Buffer.from(JSON.stringify({ v: 1, ts: Date.now() }), 'utf8')));
      await Mesh.sendPrivateMessage(WAVE_PREFIX + payload, peerId, peer.nick, null);
    } catch (err) {
      logger.error('CampusRadar', 'Wave failed', err);
    }
  } else {
    scheduleMockWaveBack(peerId);
  }
}

// Share MY real name with ONE peer. The name is signed together with the
// recipient's fingerprint + a timestamp (same binding pattern as the identity
// proof) and sent over the Noise-encrypted DM channel — it is never part of
// the broadcast presence card, so going Visible alone never exposes it.
export async function shareMyName(peerId) {
  if (!_session) return false;
  if (store().radarGhost) return false; // hidden users never transmit
  const { identity, profile } = _session;
  const name = String(profile.realName ?? '').trim().slice(0, MAX_NAME);
  if (!name) return false;
  const peer = store().radarPeers.find((p) => p.peerId === peerId);
  if (!peer) return false;
  store().appendChatMessage(peerId, {
    id: newMsgId(),
    kind: 'name',
    fingerprint: identity.fingerprint,
    nick: profile.username,
    text: name,
    ts: Date.now(),
    mine: true,
    verified: true,
  });
  store().upsertRadarPeer({ ...peer, myNameShared: true });
  if (bleAvailable) {
    try {
      await maybeSendProof(peerId);
      const payload = JSON.stringify({
        v: 1,
        idPub: toB64(identity.publicKey),
        name,
        rfp: peer.fingerprint,
        ts: Date.now(),
      });
      const sig = await sign(new Uint8Array(Buffer.from(payload, 'utf8')));
      const wire = toB64(new Uint8Array(Buffer.from(JSON.stringify({ p: payload, s: toB64(sig) }), 'utf8')));
      await Mesh.sendPrivateMessage(NAME_PREFIX + wire, peerId, peer.nick, null);
    } catch (err) {
      logger.error('CampusRadar', 'Name share failed', err);
    }
  } else {
    scheduleMockNameBack(peerId);
  }
  return true;
}

async function _send(threadId, text) {
  const clean = String(text ?? '').trim().slice(0, 500);
  if (!clean || !_session) return;
  if (store().radarGhost) return; // defense in depth — hidden users never transmit
  const { identity, profile } = _session;
  const isRoom = threadId === ROOM_THREAD;
  const msg = {
    id: newMsgId(),
    fingerprint: identity.fingerprint,
    nick: profile.username,
    text: clean,
    ts: Date.now(),
    mine: true,
    verified: true,
    // Delivery ladder applies to DMs only — room messages are fire-and-forget
    // broadcasts with no ack semantics.
    ...(isRoom ? {} : { status: 'sending' }),
  };
  store().appendChatMessage(threadId, msg);

  if (bleAvailable) {
    try {
      if (isRoom) {
        await Mesh.sendMessage(clean);
      } else {
        const peer = store().radarPeers.find((p) => p.peerId === threadId);
        await maybeSendProof(threadId); // bind our identity to the session before first DM
        // Pass OUR id so onDeliveryAck/onReadReceipt correlate back to this bubble.
        await Mesh.sendPrivateMessage(clean, threadId, peer?.nick ?? 'peer', msg.id);
        updateMessageStatus(threadId, msg.id, 'sent');
      }
    } catch (err) {
      logger.error('CampusRadar', 'Send failed', err);
      if (!isRoom) updateMessageStatus(threadId, msg.id, 'failed');
    }
  } else {
    if (!isRoom) mockStatusLadder(threadId, msg.id);
    scheduleMockReply(threadId);
  }
}

// ── delivery status (mine-in-DM messages only) ───────────────────────────────
// Monotonic ladder — a late ack can never downgrade read → delivered, and
// nothing can resurrect a failed bubble except an explicit user retry.
const STATUS_RANK = { sending: 0, sent: 1, failed: 1, delivered: 2, read: 3 };

function updateMessageStatus(threadId, msgId, status) {
  if (!threadId || !msgId || !(status in STATUS_RANK)) return;
  const msg = (store().chatThreads[threadId] ?? []).find((m) => m.id === msgId);
  if (!msg || !msg.mine || !msg.status) return;
  if (STATUS_RANK[status] <= STATUS_RANK[msg.status]) return;
  store().updateChatMessage(threadId, msgId, { status });
}

// onDeliveryStatusUpdate carries no peer id — locate the message across DM threads.
function onDeliveryStatusUpdate(messageID, status) {
  // partiallyDelivered (multi-hop relay reached some nodes) maps to 'sent'.
  const kind = status?.kind === 'partiallyDelivered' ? 'sent' : status?.kind;
  if (!messageID || !(kind in STATUS_RANK) || kind === 'sending') return;
  const threads = store().chatThreads;
  for (const threadId of Object.keys(threads)) {
    if (threadId === ROOM_THREAD) continue;
    if (threads[threadId].some((m) => m.id === messageID)) {
      updateMessageStatus(threadId, messageID, kind);
      return;
    }
  }
}

// Send read receipts for every not-yet-receipted incoming DM in this thread.
// Called when the user opens/views the thread (and inline for messages that
// arrive while the thread is on screen), so the sender's ticks turn "read"
// only when a human could actually have seen the message.
export function notifyThreadViewed(threadId) {
  if (!_session || !threadId || threadId === ROOM_THREAD) return;
  for (const m of store().chatThreads[threadId] ?? []) {
    if (m.mine || m.kind || _session.readReceipted.has(m.id)) continue;
    _session.readReceipted.add(m.id);
    if (bleAvailable) {
      Mesh.sendReadReceipt(m.id, threadId, _session.profile.username).catch(() => {});
    }
  }
}

// ── presence announcements ───────────────────────────────────────────────────

async function announcePresence(force = false) {
  if (!_session || !bleAvailable) return;
  // Ghost mode: never broadcast our presence card, so we stay out of every
  // peer's Nearby list. Any card we already sent ages out via CARD_MAX_AGE_MS.
  if (store().radarGhost) return;
  const now = Date.now();
  if (!force && now - _session.announcedAt < ANNOUNCE_MIN_INTERVAL_MS) return;
  _session.announcedAt = now;
  try {
    if (!_session.myPeerId) {
      // Peer id can arrive late on some stacks; without it our card is unbound
      // and strict receivers will drop it — retry before announcing.
      _session.myPeerId = String((await Mesh.getMyPeerID().catch(() => '')) ?? '');
      if (!_session.myPeerId) logger.warn('CampusRadar', 'Announcing without a peer id');
    }
    const header = await buildPresenceHeader();
    await Mesh.sendMessage(HELLO_PREFIX + header);
  } catch (err) {
    logger.error('CampusRadar', 'Announce failed', err);
  }
}

// ── native event handlers (validate everything before trusting it) ───────────

function onNativeMessage(m) {
  try {
    if (!_session || !m) return;
    const content = String(m.content ?? '');
    const senderPeerId = m.senderPeerID ? String(m.senderPeerID) : null;
    if (senderPeerId && _session.myPeerId && senderPeerId === _session.myPeerId) return; // own echo
    // Transport id known to belong to a blocked identity → drop everything,
    // including room broadcasts (their peer entry never exists in the store,
    // so the fingerprint check below could not catch them).
    if (senderPeerId && _session.blockedPeerIds.has(senderPeerId)) return;

    if (content.startsWith(HELLO_PREFIX)) {
      handleHello(content.slice(HELLO_PREFIX.length), senderPeerId);
      return;
    }
    if (content.startsWith(PROOF_PREFIX)) {
      handleProof(content.slice(PROOF_PREFIX.length), senderPeerId, !!m.isPrivate);
      return;
    }
    if (content.startsWith(WAVE_PREFIX)) {
      handleWave(content.slice(WAVE_PREFIX.length), senderPeerId, !!m.isPrivate);
      return;
    }
    if (content.startsWith(NAME_PREFIX)) {
      handleNameShare(content.slice(NAME_PREFIX.length), senderPeerId, !!m.isPrivate);
      return;
    }

    if (!allowByRateLimit(senderPeerId ?? String(m.sender ?? ''))) return;

    // DMs from a sender the transport can't attribute cannot be routed safely.
    const threadId = m.isPrivate ? senderPeerId : ROOM_THREAD;
    if (!threadId) return;

    const peer = store().radarPeers.find((p) => p.peerId === senderPeerId);
    if (peer && store().blockedPeers.includes(peer.fingerprint)) return;

    store().appendChatMessage(threadId, {
      id: m.id ? String(m.id) : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fingerprint: peer?.fingerprint ?? null,
      nick: peer?.nick ?? String(m.sender ?? 'Unknown'),
      text: content.slice(0, 500),
      ts: Number(m.timestamp) || Date.now(),
      mine: false,
      verified: !!peer?.verified,
    });

    if (m.isPrivate && senderPeerId) {
      maybeSendProof(senderPeerId); // reciprocal identity proof, once per session
      if (m.id) Mesh.sendDeliveryAck(String(m.id), senderPeerId).catch(() => {});
      // Thread currently on screen → the user is seeing it now; send the read
      // receipt immediately instead of waiting for the next screen focus.
      if (store().activeThreadId === senderPeerId) notifyThreadViewed(senderPeerId);
    }
  } catch (err) {
    logger.error('CampusRadar', 'Message handling failed', err);
  }
}

function handleHello(headerB64, senderPeerId) {
  let decoded;
  try {
    decoded = decodeCard(fromB64(headerB64));
  } catch (err) {
    logger.warn('CampusRadar', `Dropped malformed card (${err?.message})`);
    return;
  }
  const check = validateHello(decoded, { senderPeerId });
  if (!check.ok) {
    logger.warn('CampusRadar', `Dropped hello: ${check.reason}`);
    return;
  }
  // Relayed broadcasts arrive more than once — dedupe by identity + timestamp.
  const seenKey = `${fingerprintOf(decoded.idPub)}:${decoded.ts}`;
  if (_session.seenCards.has(seenKey)) return;
  _session.seenCards.set(seenKey, true);
  if (_session.seenCards.size > SEEN_CARDS_MAX) {
    _session.seenCards.delete(_session.seenCards.keys().next().value);
  }
  ingestPeer(evaluatePeer(decoded, decoded.peerId));
  announcePresence(); // make sure they meet us too (throttled)
}

// Identity proof over the Noise-encrypted DM channel: signs (idPub, our peer
// id, the RECIPIENT's fingerprint, ts) so a proof addressed to Mallory can
// never be replayed to Bob, and marks the peer `proven` on success.
function handleProof(proofB64, senderPeerId, isPrivate) {
  if (!isPrivate || !senderPeerId || !_session) return; // only accepted over the encrypted channel
  try {
    const wrapper = JSON.parse(Buffer.from(fromB64(proofB64)).toString('utf8'));
    const payload = String(wrapper.p ?? '');
    const claims = JSON.parse(payload);
    const idPub = fromB64(String(claims.idPub ?? ''));
    const sig = fromB64(String(wrapper.s ?? ''));
    const ok =
      Math.abs(Date.now() - Number(claims.ts)) <= PROOF_MAX_AGE_MS &&
      String(claims.peerId) === senderPeerId &&
      String(claims.rfp) === _session.identity.fingerprint &&
      verify(new Uint8Array(Buffer.from(payload, 'utf8')), sig, idPub);
    if (!ok) {
      logger.warn('CampusRadar', 'Dropped invalid identity proof');
      return;
    }
    const fpr = fingerprintOf(idPub);
    const peer = store().radarPeers.find((p) => p.peerId === senderPeerId);
    if (peer && peer.fingerprint === fpr) {
      store().upsertRadarPeer({ ...peer, proven: true });
    }
  } catch {
    logger.warn('CampusRadar', 'Proof parse failed');
  }
}

async function maybeSendProof(peerId) {
  if (!bleAvailable || !_session || _session.provenTo.has(peerId)) return;
  _session.provenTo.add(peerId);
  const peer = store().radarPeers.find((p) => p.peerId === peerId);
  if (!peer) return;
  try {
    const payload = JSON.stringify({
      v: 1,
      idPub: toB64(_session.identity.publicKey),
      peerId: _session.myPeerId,
      rfp: peer.fingerprint,
      ts: Date.now(),
    });
    const sig = await sign(new Uint8Array(Buffer.from(payload, 'utf8')));
    const wire = toB64(new Uint8Array(Buffer.from(JSON.stringify({ p: payload, s: toB64(sig) }), 'utf8')));
    await Mesh.sendPrivateMessage(PROOF_PREFIX + wire, peerId, peer.nick, null);
  } catch (err) {
    logger.warn('CampusRadar', 'Proof send failed', err);
  }
}

// Pure receive-side guard for a name share (unit-tested). Mirrors the identity
// proof checks:
//  freshness — |now − ts| within PROOF_MAX_AGE_MS (no replaying old shares)
//  recipient — rfp must be MY fingerprint (a share addressed to Mallory can
//              never be replayed to Bob)
//  identity  — idPub must hash to the sender's known card fingerprint
//  signature — Ed25519 over the exact payload string
export function checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint, now = Date.now() }) {
  try {
    const claims = JSON.parse(String(payload));
    const name = String(claims.name ?? '').trim().slice(0, MAX_NAME);
    if (!name) return { ok: false, reason: 'empty' };
    if (Math.abs(now - Number(claims.ts)) > PROOF_MAX_AGE_MS) return { ok: false, reason: 'stale' };
    if (String(claims.rfp) !== myFingerprint) return { ok: false, reason: 'wrong-recipient' };
    const idPub = fromB64(String(claims.idPub ?? ''));
    if (fingerprintOf(idPub) !== peerFingerprint) return { ok: false, reason: 'identity-mismatch' };
    if (!verify(new Uint8Array(Buffer.from(String(payload), 'utf8')), fromB64(String(sigB64 ?? '')), idPub)) {
      return { ok: false, reason: 'signature' };
    }
    return { ok: true, name };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

function handleNameShare(wireB64, senderPeerId, isPrivate) {
  if (!isPrivate || !senderPeerId || !_session) return; // encrypted channel only
  if (!allowByRateLimit(senderPeerId)) return;
  try {
    const wrapper = JSON.parse(Buffer.from(fromB64(wireB64)).toString('utf8'));
    const peer = store().radarPeers.find((p) => p.peerId === senderPeerId);
    if (!peer || store().blockedPeers.includes(peer.fingerprint)) return;
    const res = checkNameShare({
      payload: String(wrapper.p ?? ''),
      sigB64: String(wrapper.s ?? ''),
      peerFingerprint: peer.fingerprint,
      myFingerprint: _session.identity.fingerprint,
    });
    if (!res.ok) {
      logger.warn('CampusRadar', `Dropped name share: ${res.reason}`);
      return;
    }
    store().upsertRadarPeer({ ...peer, realName: res.name });
    store().appendChatMessage(senderPeerId, {
      id: newMsgId(),
      kind: 'name',
      fingerprint: peer.fingerprint,
      nick: peer.nick,
      text: res.name,
      ts: Date.now(),
      mine: false,
      verified: true,
    });
  } catch {
    logger.warn('CampusRadar', 'Name share parse failed');
  }
}

function handleWave(payloadB64, senderPeerId, isPrivate) {
  if (!isPrivate || !senderPeerId || !_session) return;
  if (!allowByRateLimit(senderPeerId)) return;
  const peer = store().radarPeers.find((p) => p.peerId === senderPeerId);
  if (!peer || store().blockedPeers.includes(peer.fingerprint)) return;
  try {
    const { ts } = JSON.parse(Buffer.from(fromB64(payloadB64)).toString('utf8'));
    if (Math.abs(Date.now() - Number(ts)) > PROOF_MAX_AGE_MS) return; // stale relay
  } catch {
    return;
  }
  store().appendChatMessage(senderPeerId, {
    id: newMsgId(),
    kind: 'wave',
    fingerprint: peer.fingerprint,
    nick: peer.nick,
    text: '👋',
    ts: Date.now(),
    mine: false,
    verified: !!peer.verified,
  });
}

// Merge link telemetry (RSSI, connection, Noise state) into known peers and
// drop peers that left the mesh a while ago.
function onPeerSnapshots(snapshots) {
  if (!_session) return;
  try {
    const byId = new Map((snapshots ?? []).map((p) => [String(p.peerID), p]));
    const now = Date.now();
    const next = [];
    for (const peer of store().radarPeers) {
      const snap = byId.get(peer.peerId);
      if (snap) {
        next.push({
          ...peer,
          rssi: typeof snap.rssi === 'number' ? snap.rssi : peer.rssi,
          connected: !!snap.isConnected,
          encrypted: !!snap.isEncrypted,
          lastSeen: now,
        });
        byId.delete(peer.peerId);
      } else if (now - (peer.lastSeen ?? 0) < PEER_LINGER_MS) {
        next.push({ ...peer, connected: false });
      }
    }
    store().setRadarPeers(next);
    // Snapshot ids we have no card for yet → announce so they learn us (they
    // announce back on receipt); throttled inside announcePresence.
    for (const [id] of byId) {
      if (id && id !== _session.myPeerId) {
        announcePresence();
        break;
      }
    }
  } catch (err) {
    logger.error('CampusRadar', 'Snapshot handling failed', err);
  }
}

function onPeerGone(peerID) {
  if (!_session || !peerID) return;
  const peer = store().radarPeers.find((p) => p.peerId === String(peerID));
  if (peer) store().upsertRadarPeer({ ...peer, connected: false });
}

// Sliding-window ingest cap per peer — a flooding device gets muted locally.
function allowByRateLimit(key) {
  if (!key) return true;
  const now = Date.now();
  const recent = (_session.msgLog.get(key) ?? []).filter((t) => now - t < MSG_WINDOW_MS);
  if (recent.length >= MSG_WINDOW_MAX) {
    _session.msgLog.set(key, recent);
    logger.warn('CampusRadar', 'Rate-limited a flooding peer');
    return false;
  }
  recent.push(now);
  _session.msgLog.set(key, recent);
  if (_session.msgLog.size > 100) _session.msgLog.clear(); // hard cap, resets harmlessly
  return true;
}

// ── MOCK mode ─────────────────────────────────────────────────────────────────
// Synthetic peers whose match scores are computed through the REAL crypto path
// (and the real evaluatePeer), so the UI shows realistic rankings — including
// program/semester badges and tandem matches — without any Bluetooth hardware.
// Language ids: 1=de 2=en 4=es 12=ar (see LANGUAGES in campusProfile.js).
const MOCK_PROFILES = [
  { nick: 'GrünerFuchs', status: 'Kaffee & Kickerrunde?', origin: 'DE', interests: ['coffee', 'football', 'music', 'hiking'], programId: 15, semester: 3, speak: [1], learn: [2, 4], openTo: ['study', 'coffee'], realName: 'Jonas' },
  { nick: ' Layla_k', status: 'new int student, say hi!', origin: 'INT', interests: ['coffee', 'coding', 'music', 'photography'], programId: 24, semester: 1, speak: [2, 12], learn: [1], openTo: ['tandem', 'events'], realName: 'Layla' },
  { nick: 'MensaMax', status: 'study group for DBIS', origin: 'DE', interests: ['coding', 'gaming', 'coffee'], programId: 1, semester: 5, speak: [1, 2], learn: [], openTo: ['study', 'mensa'], realName: 'Max' },
  { nick: 'sol_travels', status: 'looking for a language tandem', origin: 'INT', interests: ['languages', 'hiking', 'cooking'], programId: 13, semester: 2, speak: [4, 2], learn: [1], openTo: ['tandem', 'sports'], realName: 'Sol' },
];

function startMock() {
  logger.info('CampusRadar', 'Started (MOCK mode — no BLE hardware)');
  const { ephKeyPair } = _session;
  MOCK_PROFILES.forEach((m, i) => {
    const t = setTimeout(() => {
      if (!_session) return;
      const peerEph = newEphemeralKeyPair();
      const shared = deriveSharedSecret(peerEph.secretKey, ephKeyPair.publicKey);
      const peerTokens = blindTokens(m.interests, shared);
      const idPub = require('tweetnacl').sign.keyPair().publicKey;
      // Signature check is bypassed for mock peers (no real key to sign with);
      // everything downstream of validateHello runs the production path.
      const decoded = {
        origin: m.origin,
        ephPub: peerEph.publicKey,
        idPub,
        nick: m.nick,
        status: m.status,
        programId: m.programId,
        semester: m.semester,
        openTo: openToMask(m.openTo),
        speak: m.speak,
        learn: m.learn,
        tokens: peerTokens,
        body: new Uint8Array(),
        signature: new Uint8Array(),
      };
      ingestPeer({ ...evaluatePeer(decoded, `mock_${i}`), rssi: -45 - Math.floor(Math.random() * 30) });
    }, 600 + i * 700);
    _session.timers.push(t);
  });
}

function mockProfileFor(peerId) {
  const idx = Number(String(peerId).replace('mock_', ''));
  return MOCK_PROFILES[idx] ?? null;
}

function scheduleMockWaveBack(peerId) {
  const peer = store().radarPeers.find((p) => p.peerId === peerId);
  if (!_session || !peer) return;
  const t = setTimeout(() => {
    if (!_session) return;
    store().appendChatMessage(peerId, {
      id: newMsgId(),
      kind: 'wave',
      fingerprint: peer.fingerprint,
      nick: peer.nick,
      text: '👋',
      ts: Date.now(),
      mine: false,
      verified: true,
    });
  }, 1500);
  _session.timers.push(t);
}

function scheduleMockNameBack(peerId) {
  const peer = store().radarPeers.find((p) => p.peerId === peerId);
  const mock = mockProfileFor(peerId);
  if (!_session || !peer || !mock?.realName) return;
  const t = setTimeout(() => {
    if (!_session) return;
    const current = store().radarPeers.find((p) => p.peerId === peerId);
    if (current) store().upsertRadarPeer({ ...current, realName: mock.realName });
    store().appendChatMessage(peerId, {
      id: newMsgId(),
      kind: 'name',
      fingerprint: peer.fingerprint,
      nick: peer.nick,
      text: mock.realName,
      ts: Date.now(),
      mine: false,
      verified: true,
    });
  }, 2000);
  _session.timers.push(t);
}

const MOCK_REPLIES = [
  'hey! yeah I’m around 🙂',
  'nice, which building are you in?',
  'cool — see you at the Mensa?',
  'sounds good, let’s meet up 👍',
];

// Simulate the DM delivery ladder in mock mode so the ticks are demoable.
function mockStatusLadder(threadId, msgId) {
  if (!_session) return;
  _session.timers.push(
    setTimeout(() => _session && updateMessageStatus(threadId, msgId, 'sent'), 250),
    setTimeout(() => _session && updateMessageStatus(threadId, msgId, 'delivered'), 900)
  );
}

function scheduleMockReply(threadId) {
  if (!_session || threadId === ROOM_THREAD) return;
  const peer = store().radarPeers.find((p) => p.peerId === threadId);
  if (!peer) return;
  const t = setTimeout(() => {
    if (!_session) return;
    // A reply implies the mock peer has seen the conversation → mark our
    // delivered messages as read, exactly like a real read receipt would.
    for (const m of store().chatThreads[threadId] ?? []) {
      if (m.mine && m.status) updateMessageStatus(threadId, m.id, 'read');
    }
    store().appendChatMessage(threadId, {
      id: newMsgId(),
      fingerprint: peer.fingerprint,
      nick: peer.nick,
      text: MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)],
      ts: Date.now(),
      mine: false,
      verified: true,
    });
  }, 1200);
  _session.timers.push(t);
}
