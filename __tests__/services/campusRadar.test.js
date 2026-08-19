// react-native-mesh-sdk's native module is absent under Jest (NativeModules.MeshSdk
// is undefined), so the guard leaves the wrapper in MOCK mode — which is exactly
// what we exercise here, plus the pure validateHello() security guards.
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x',
    getItemAsync: jest.fn(async (k) => (k in store ? store[k] : null)),
    setItemAsync: jest.fn(async (k, v) => { store[k] = v; }),
    deleteItemAsync: jest.fn(async (k) => { delete store[k]; }),
  };
});

import nacl from 'tweetnacl';
import useStore from '../../store/useStore';
import {
  startRadar,
  stopRadar,
  sendRoomMessage,
  sendPrivateMessage,
  sendWave,
  shareMyName,
  checkNameShare,
  setGhostMode,
  isBleAvailable,
  validateHello,
  ROOM_THREAD,
} from '../../services/campusRadar';
import {
  encodeCardBody,
  encodeCard,
  decodeCard,
  newEphemeralKeyPair,
} from '../../services/campusProfile';
import { fingerprintOf, toB64 } from '../../services/campusIdentity';

describe('campusRadar (mock mode)', () => {
  beforeEach(async () => {
    await stopRadar();
    useStore.setState({
      campusProfile: { username: 'Tester', status: 'hi', origin: 'DE', interests: ['coffee', 'coding'] },
      radarPeers: [],
      chatThreads: {},
      blockedPeers: [],
      radarUnread: {},
      radarGhost: false, // outbound paths are service-guarded in Ghost mode
      activeThreadId: null,
    });
  });

  it('reports BLE unavailable under Jest (falls back to mock)', () => {
    expect(isBleAvailable()).toBe(false);
  });

  it('requires a profile before starting', async () => {
    useStore.setState({ campusProfile: null });
    await expect(startRadar()).rejects.toThrow('PROFILE_REQUIRED');
  });

  it('discovers synthetic peers with real match scores', async () => {
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    const peers = useStore.getState().radarPeers;
    expect(peers.length).toBeGreaterThan(0);
    // every mock peer is signed-verified and has a computed score
    expect(peers.every((p) => p.verified)).toBe(true);
    expect(peers.some((p) => p.sharedCount > 0)).toBe(true);
    // a DE tester should get a buddy match against an INT mock peer
    expect(peers.some((p) => p.buddyMatch)).toBe(true);
    jest.useRealTimers();
  });

  it('appends my room message to the store thread', async () => {
    await startRadar();
    await sendRoomMessage('hello campus');
    const thread = useStore.getState().chatThreads[ROOM_THREAD];
    expect(thread).toHaveLength(1);
    expect(thread[0]).toMatchObject({ text: 'hello campus', mine: true });
  });

  it('stopRadar clears live peers and disables', async () => {
    await startRadar();
    await stopRadar();
    expect(useStore.getState().radarEnabled).toBe(false);
    expect(useStore.getState().radarPeers).toHaveLength(0);
  });

  it('setGhostMode toggles discoverability without stopping discovery', async () => {
    await setGhostMode(true);
    expect(useStore.getState().radarGhost).toBe(true);
    await setGhostMode(false);
    expect(useStore.getState().radarGhost).toBe(false);
    // still discovers peers while visible (mock path unaffected by ghost flag)
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    expect(useStore.getState().radarPeers.length).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('mock peers carry v3 card fields (program, semester, openTo, languages)', async () => {
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    const peers = useStore.getState().radarPeers;
    expect(peers.every((p) => p.programId > 0)).toBe(true);
    expect(peers.some((p) => p.semester > 0)).toBe(true);
    expect(peers.some((p) => p.openTo.includes('tandem'))).toBe(true);
    jest.useRealTimers();
  });

  it('sendWave appends my wave and a mock wave-back', async () => {
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    const peerId = useStore.getState().radarPeers[0].peerId;
    await sendWave(peerId);
    await jest.advanceTimersByTimeAsync(2000);
    const waves = (useStore.getState().chatThreads[peerId] ?? []).filter((m) => m.kind === 'wave');
    expect(waves).toHaveLength(2);
    expect(waves[0].mine).toBe(true);
    expect(waves[1].mine).toBe(false);
    jest.useRealTimers();
  });

  it('shareMyName marks the peer, and the mock peer shares a name back', async () => {
    useStore.setState({
      campusProfile: { username: 'Tester', realName: 'Test User', status: '', origin: 'DE', interests: [] },
    });
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    const peerId = useStore.getState().radarPeers[0].peerId;
    const ok = await shareMyName(peerId);
    expect(ok).toBe(true);
    await jest.advanceTimersByTimeAsync(2500);
    const peer = useStore.getState().radarPeers.find((p) => p.peerId === peerId);
    expect(peer.myNameShared).toBe(true);
    expect(peer.realName).toBeTruthy(); // mock peer reciprocated
    const kinds = (useStore.getState().chatThreads[peerId] ?? []).map((m) => m.kind);
    expect(kinds).toContain('name');
    jest.useRealTimers();
  });

  it('shareMyName refuses when no real name is saved in the profile', async () => {
    jest.useFakeTimers();
    await startRadar(); // profile from beforeEach has no realName
    await jest.advanceTimersByTimeAsync(4000);
    const peerId = useStore.getState().radarPeers[0].peerId;
    expect(await shareMyName(peerId)).toBe(false);
    jest.useRealTimers();
  });

  it('Ghost mode blocks EVERY outbound path at the service level', async () => {
    useStore.setState({
      campusProfile: { username: 'Tester', realName: 'Test User', status: '', origin: 'DE', interests: [] },
    });
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    const peerId = useStore.getState().radarPeers[0].peerId;

    useStore.setState({ radarGhost: true });
    await sendRoomMessage('should not leave the phone');
    await sendPrivateMessage(peerId, 'nor this');
    await sendWave(peerId);
    expect(await shareMyName(peerId)).toBe(false);

    expect(useStore.getState().chatThreads[ROOM_THREAD] ?? []).toHaveLength(0);
    expect(useStore.getState().chatThreads[peerId] ?? []).toHaveLength(0);
    jest.useRealTimers();
  });

  it('DM delivery ladder: sending → sent → delivered → read (mock)', async () => {
    jest.useFakeTimers();
    await startRadar();
    await jest.advanceTimersByTimeAsync(4000);
    const peerId = useStore.getState().radarPeers[0].peerId;

    await sendPrivateMessage(peerId, 'hey!');
    const msgId = useStore.getState().chatThreads[peerId][0].id;
    const statusOf = () => useStore.getState().chatThreads[peerId].find((m) => m.id === msgId).status;

    expect(statusOf()).toBe('sending');
    await jest.advanceTimersByTimeAsync(300);
    expect(statusOf()).toBe('sent');
    await jest.advanceTimersByTimeAsync(700);
    expect(statusOf()).toBe('delivered');
    await jest.advanceTimersByTimeAsync(400); // mock reply lands → read receipt semantics
    expect(statusOf()).toBe('read');
    // room messages never carry a delivery status
    await sendRoomMessage('broadcast');
    expect(useStore.getState().chatThreads[ROOM_THREAD][0].status).toBeUndefined();
    jest.useRealTimers();
  });

  it('caps a chat thread at 200 messages', () => {
    const { appendChatMessage } = useStore.getState();
    for (let i = 0; i < 210; i++) {
      appendChatMessage('cap_test', { id: `m${i}`, text: `${i}`, ts: i, mine: true, verified: true });
    }
    const thread = useStore.getState().chatThreads.cap_test;
    expect(thread).toHaveLength(200);
    expect(thread[0].id).toBe('m10'); // oldest ten dropped
    expect(thread[199].id).toBe('m209');
  });
});

describe('checkNameShare — encrypted name-share guards', () => {
  const idKey = nacl.sign.keyPair();
  const peerFingerprint = fingerprintOf(idKey.publicKey);
  const MY_FP = 'deadbeefdeadbeef';

  function makeShare({ name = 'Anna Schmidt', rfp = MY_FP, ts = Date.now(), signer = idKey, tamper = false } = {}) {
    const payload = JSON.stringify({ v: 1, idPub: toB64(signer.publicKey), name, rfp, ts });
    const sig = nacl.sign.detached(new Uint8Array(Buffer.from(payload, 'utf8')), signer.secretKey);
    if (tamper) sig[0] ^= 0xff;
    return { payload, sigB64: toB64(sig) };
  }

  it('accepts a fresh share addressed to me from the known card identity', () => {
    const { payload, sigB64 } = makeShare();
    expect(checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint: MY_FP })).toEqual({
      ok: true,
      name: 'Anna Schmidt',
    });
  });

  it('rejects a share addressed to someone else (no replay to third parties)', () => {
    const { payload, sigB64 } = makeShare({ rfp: 'ffffffffffffffff' });
    expect(checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint: MY_FP }).reason).toBe('wrong-recipient');
  });

  it('rejects a stale captured share', () => {
    const { payload, sigB64 } = makeShare({ ts: Date.now() - 6 * 60 * 1000 });
    expect(checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint: MY_FP }).reason).toBe('stale');
  });

  it('rejects a name signed by a different identity than the presence card', () => {
    const other = nacl.sign.keyPair();
    const { payload, sigB64 } = makeShare({ signer: other });
    expect(checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint: MY_FP }).reason).toBe('identity-mismatch');
  });

  it('rejects a tampered signature', () => {
    const { payload, sigB64 } = makeShare({ tamper: true });
    expect(checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint: MY_FP }).reason).toBe('signature');
  });

  it('rejects malformed payloads and empty names', () => {
    expect(checkNameShare({ payload: 'not json', sigB64: '', peerFingerprint, myFingerprint: MY_FP }).reason).toBe('malformed');
    const { payload, sigB64 } = makeShare({ name: '   ' });
    expect(checkNameShare({ payload, sigB64, peerFingerprint, myFingerprint: MY_FP }).reason).toBe('empty');
  });
});

describe('validateHello — app-layer replay & impersonation guards', () => {
  const PEER_ID = 'a1b2c3d4e5f60718';

  // Build a REAL signed card the way a genuine peer would, then decode it —
  // the exact bytes-on-air path.
  function signedCard({ ts = Math.floor(Date.now() / 1000), peerId = PEER_ID, tamper = false } = {}) {
    const idKey = nacl.sign.keyPair();
    const eph = newEphemeralKeyPair();
    const body = encodeCardBody({
      origin: 'INT',
      ts,
      peerId,
      ephPub: eph.publicKey,
      idPub: idKey.publicKey,
      nick: 'Layla',
      status: 'say hi!',
      tokens: [],
    });
    const sig = nacl.sign.detached(body, idKey.secretKey);
    if (tamper) sig[0] ^= 0xff;
    return decodeCard(encodeCard(body, sig));
  }

  it('accepts a fresh, signed card bound to its transport sender', () => {
    const res = validateHello(signedCard(), { senderPeerId: PEER_ID });
    expect(res).toEqual({ ok: true });
  });

  it('rejects a stale card (captured & replayed later)', () => {
    const now = Date.now();
    const old = signedCard({ ts: Math.floor(now / 1000) - 3 * 24 * 3600 }); // 3 days old
    expect(validateHello(old, { senderPeerId: PEER_ID, now })).toMatchObject({
      ok: false,
      reason: 'stale',
    });
  });

  it('rejects a valid card re-broadcast from a different device (impersonation)', () => {
    const res = validateHello(signedCard(), { senderPeerId: 'ffffffffffffffff' });
    expect(res).toMatchObject({ ok: false, reason: 'peer-mismatch' });
  });

  it('rejects a card whose signature does not verify', () => {
    const res = validateHello(signedCard({ tamper: true }), { senderPeerId: PEER_ID });
    expect(res).toMatchObject({ ok: false, reason: 'signature' });
  });

  it('rejects a card that carries no transport binding at all', () => {
    const res = validateHello(signedCard({ peerId: '' }), { senderPeerId: PEER_ID });
    expect(res).toMatchObject({ ok: false, reason: 'unbound' });
  });
});
