// Mock expo-secure-store with an in-memory map (not provided by jest-expo as writable).
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
    getItemAsync: jest.fn(async (k) => (k in store ? store[k] : null)),
    setItemAsync: jest.fn(async (k, v) => {
      store[k] = v;
    }),
    deleteItemAsync: jest.fn(async (k) => {
      delete store[k];
    }),
    __store: store,
  };
});

import nacl from 'tweetnacl';
import {
  getIdentity,
  sign,
  verify,
  getFingerprint,
  fingerprintOf,
  resetIdentity,
  _clearIdentityCache,
  toB64,
  fromB64,
} from '../../services/campusIdentity';

const utf8 = (s) => new Uint8Array(Buffer.from(s, 'utf8'));

describe('campusIdentity', () => {
  beforeEach(async () => {
    await resetIdentity(); // clears cache + storage
  });

  it('generates a keypair on first use and persists it', async () => {
    const id = await getIdentity();
    expect(id.publicKey).toHaveLength(32);
    expect(id.secretKey).toHaveLength(64);
    expect(id.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns a stable identity across reads (persistence + cache)', async () => {
    const first = await getIdentity();
    _clearIdentityCache(); // force re-read from storage
    const second = await getIdentity();
    expect(second.publicKeyB64).toBe(first.publicKeyB64);
    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it('signs a message that verifies with its own public key', async () => {
    const { publicKey } = await getIdentity();
    const msg = utf8('hallo campus');
    const sig = await sign(msg);
    expect(sig).toHaveLength(64);
    expect(verify(msg, sig, publicKey)).toBe(true);
  });

  it('rejects a tampered message', async () => {
    const { publicKey } = await getIdentity();
    const sig = await sign(utf8('meet at the mensa 12:00'));
    expect(verify(utf8('meet at the mensa 13:00'), sig, publicKey)).toBe(false);
  });

  it('rejects a signature from a different key (spoof attempt)', async () => {
    const msg = utf8('I am GreenFox');
    const sig = await sign(msg);
    const impostor = nacl.sign.keyPair().publicKey;
    expect(verify(msg, sig, impostor)).toBe(false);
  });

  it('fingerprint is deterministic for a public key', async () => {
    const { publicKey, fingerprint } = await getIdentity();
    expect(fingerprintOf(publicKey)).toBe(fingerprint);
    expect(await getFingerprint()).toBe(fingerprint);
  });

  it('base64 round-trips bytes', () => {
    const bytes = nacl.randomBytes(20);
    expect(Array.from(fromB64(toB64(bytes)))).toEqual(Array.from(bytes));
  });
});
