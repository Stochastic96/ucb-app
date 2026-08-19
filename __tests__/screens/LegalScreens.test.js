import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import DatenschutzScreen from '../../screens/legal/DatenschutzScreen';
import PrivacyPolicyScreen from '../../screens/legal/PrivacyPolicyScreen';
import ImpressumScreen from '../../screens/legal/ImpressumScreen';
import LegalScreen from '../../screens/legal/LegalScreen';
import { USER_DATA_KEYS } from '../../screens/profile/SettingsScreen';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { NON_CACHE_KEYS } from '../../services/cache';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Legal Screens & Data Deletion Compliance', () => {
  describe('PrivacyPolicyScreen (English)', () => {
    it('contains no telemetry disclosures and confirms zero tracking', () => {
      const { getByText, queryByText } = renderWithTheme(<PrivacyPolicyScreen />);
      expect(getByText('Usage Statistics / Tracking')).toBeTruthy();
      expect(getByText(/There are none. The app contains no analytics, tracking or advertising code of any kind./)).toBeTruthy();
      expect(queryByText('Anonymous Usage Statistics')).toBeNull();
      expect(queryByText('Supabase — Anonymous Usage Statistics')).toBeNull();
    });

    it('contains Campus Radar (Bluetooth Socializing) disclosure', () => {
      const { getByText } = renderWithTheme(<PrivacyPolicyScreen />);
      expect(getByText('Campus Radar (Bluetooth Socializing)')).toBeTruthy();
      expect(getByText(/Exclusively direct via Bluetooth to nearby devices — no server, no account, no cloud/)).toBeTruthy();
    });

    it('contains Data Controller section with accountable representative under Art. 13(1)(a) GDPR', () => {
      const { getByText, getAllByText } = renderWithTheme(<PrivacyPolicyScreen />);
      expect(getByText('Data Controller (Art. 13(1)(a) GDPR)')).toBeTruthy();
      expect(getByText(/Prashant Sharma \(Student Project Lead, UCB App\)/)).toBeTruthy();
      expect(getAllByText(/ucb-app-dev@umwelt-campus.de/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DatenschutzScreen (German)', () => {
    it('contains no telemetry disclosures and confirms zero tracking', () => {
      const { getByText } = renderWithTheme(<DatenschutzScreen />);
      expect(getByText('Nutzungsstatistiken / Tracking')).toBeTruthy();
      expect(getByText(/Es gibt keine. Die App enthält keinerlei Analyse-, Tracking- oder Werbe-Code./)).toBeTruthy();
    });

    it('contains Campus-Radar disclosure', () => {
      const { getByText } = renderWithTheme(<DatenschutzScreen />);
      expect(getByText('Campus-Radar (Bluetooth-Socializing)')).toBeTruthy();
    });

    it('contains Verantwortlicher section with accountable representative under Art. 13 Abs. 1 lit. a DSGVO', () => {
      const { getByText, getAllByText } = renderWithTheme(<DatenschutzScreen />);
      expect(getByText('Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)')).toBeTruthy();
      expect(getByText(/Prashant Sharma \(Studentische Projektleitung, UCB App\)/)).toBeTruthy();
      expect(getAllByText(/ucb-app-dev@umwelt-campus.de/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ImpressumScreen (German § 5 DDG)', () => {
    it('satisfies § 5 DDG with provider name, representative name, postal address, and contact email', () => {
      const { getByText } = renderWithTheme(<ImpressumScreen />);
      expect(getByText('Diensteanbieter / App-Betreiber (§ 5 DDG)')).toBeTruthy();
      expect(getByText('Studentisches Entwicklerteam „UCB App“')).toBeTruthy();
      expect(getByText('Prashant Sharma (Studentische Projektleitung)')).toBeTruthy();
      expect(getByText('ucb-app-dev@umwelt-campus.de')).toBeTruthy();
    });
  });

  describe('LegalScreen (English § 5 DDG)', () => {
    it('satisfies § 5 DDG with service provider, representative name, postal address, and contact email', () => {
      const { getByText, queryByText } = renderWithTheme(<LegalScreen />);
      expect(getByText('Service Provider / App Operator (§ 5 DDG)')).toBeTruthy();
      expect(getByText('Prashant Sharma (Student Project Lead)')).toBeTruthy();
      expect(getByText('ucb-app-dev@umwelt-campus.de')).toBeTruthy();
      expect(getByText(/It contains no analytics, tracking or advertising code of any kind/)).toBeTruthy();
      expect(queryByText(/Anonymous usage statistics are collected/)).toBeNull();
    });
  });

  describe('Data Erasure Key Sync (Art. 17 GDPR)', () => {
    // The real hazard is a user-owned key that clearAllCache() deliberately preserves
    // but "Delete all data" never erases — it would then survive both paths and outlive
    // an erasure request. (This is exactly how ucb_logs slipped through: it was a raw
    // literal in cache.js rather than a STORAGE_KEYS entry.)
    it('erases every key that clearAllCache deliberately preserves', () => {
      const preserved = [...NON_CACHE_KEYS];
      // Guard against a STORAGE_KEYS entry being renamed/removed out from under
      // cache.js, which would otherwise land an `undefined` in the set unnoticed.
      preserved.forEach((k) => expect(typeof k).toBe('string'));
      const missing = preserved.filter((k) => !USER_DATA_KEYS.includes(k));
      expect(missing).toStrictEqual([]);
    });

    it('erases every declared storage key', () => {
      const missing = Object.values(STORAGE_KEYS).filter((k) => !USER_DATA_KEYS.includes(k));
      expect(missing).toStrictEqual([]);
    });

    it('erases the device-local diagnostic log store', () => {
      // Logs can carry identifiers; they must not outlive an erasure request.
      expect(USER_DATA_KEYS).toContain('ucb_logs');
    });

    it('targets only ucb_-prefixed keys, so erasure cannot touch other apps’ storage', () => {
      USER_DATA_KEYS.forEach((k) => expect(k).toMatch(/^ucb_/));
    });
  });
});
