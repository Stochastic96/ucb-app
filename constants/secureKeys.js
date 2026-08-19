// Single source of truth for all expo-secure-store key strings.
// Never use raw string literals for these keys elsewhere.
export const SECURE_KEYS = {
  USERNAME: 'username',
  PASSWORD: 'password',
  SESSION_CREATED: 'ucb_session_created',
  BIOMETRIC_ENABLED: 'ucb_secure_biometric_enabled',
  // Campus Radar: persistent Ed25519 identity keypair (base64). Self-generated,
  // never linked to Stud.IP — device-only signing identity for P2P socializing.
  CAMPUS_ID_SK: 'ucb_secure_campus_id_sk',
  CAMPUS_ID_PK: 'ucb_secure_campus_id_pk',
};
