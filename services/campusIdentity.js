// Campus Radar — cryptographic identity.
//
// Every user has a persistent Ed25519 signing keypair, generated on-device on
// first use and stored in expo-secure-store. It is NEVER derived from or linked
// to the Stud.IP account — it is an anonymous, self-owned identity used only to
// sign the P2P social profile/messages so a username cannot be spoofed by a peer.
//
// Identity on the wire is the *fingerprint* (truncated hash of the public key),
// not any personal data. Pure JS (tweetnacl) so it is fully unit-testable.

import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
import { SECURE_KEYS } from '../constants/secureKeys';

const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// In-memory cache so screens/services don't hit SecureStore repeatedly.
let _identity = null;

export function toB64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

export function fromB64(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export function toHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

// Stable short identity: first 8 bytes of the hash of the public key → 16 hex chars.
// Used as the peer id / avatar seed; contains no personal data.
export function fingerprintOf(publicKey) {
  return toHex(nacl.hash(publicKey).slice(0, 8));
}

// Loads the persisted keypair, generating + persisting one on first use.
export async function getIdentity() {
  if (_identity) return _identity;

  let sk = await SecureStore.getItemAsync(SECURE_KEYS.CAMPUS_ID_SK);
  let pk = await SecureStore.getItemAsync(SECURE_KEYS.CAMPUS_ID_PK);

  if (!sk || !pk) {
    const pair = nacl.sign.keyPair();
    sk = toB64(pair.secretKey);
    pk = toB64(pair.publicKey);
    await SecureStore.setItemAsync(SECURE_KEYS.CAMPUS_ID_SK, sk, SECURE_OPTS);
    await SecureStore.setItemAsync(SECURE_KEYS.CAMPUS_ID_PK, pk, SECURE_OPTS);
  }

  const secretKey = fromB64(sk);
  const publicKey = fromB64(pk);
  _identity = {
    secretKey,
    publicKey,
    publicKeyB64: pk,
    fingerprint: fingerprintOf(publicKey),
  };
  return _identity;
}

// Ed25519 detached signature over an arbitrary byte payload.
export async function sign(message) {
  const { secretKey } = await getIdentity();
  return nacl.sign.detached(message, secretKey);
}

// Static verify — no identity needed; caller supplies the claimed public key.
export function verify(message, signature, publicKey) {
  try {
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}

export async function getFingerprint() {
  const { fingerprint } = await getIdentity();
  return fingerprint;
}

// Wipes the in-memory cache + persisted keys (e.g. on logout / identity reset).
export async function resetIdentity() {
  _identity = null;
  await SecureStore.deleteItemAsync(SECURE_KEYS.CAMPUS_ID_SK);
  await SecureStore.deleteItemAsync(SECURE_KEYS.CAMPUS_ID_PK);
}

// Test-only: clear the in-memory cache without touching storage.
export function _clearIdentityCache() {
  _identity = null;
}
