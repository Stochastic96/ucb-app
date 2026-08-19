import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import useStore from '../../store/useStore';
import OnboardingScreen from '../../screens/onboarding/OnboardingScreen';

const navigation = { navigate: jest.fn() };

const renderScreen = () =>
  render(
    <PaperProvider>
      <ThemeProvider>
        <OnboardingScreen navigation={navigation} />
      </ThemeProvider>
    </PaperProvider>
  );

describe('OnboardingScreen (first run)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useStore.setState({ onboarded: false, language: 'en' });
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDED);
  });

  it('renders the welcome slide with the language choice and unofficial disclaimer', () => {
    const { getByText } = renderScreen();
    expect(getByText('UCB Navigator')).toBeTruthy();
    expect(getByText('English')).toBeTruthy();
    expect(getByText('Deutsch')).toBeTruthy();
    expect(getByText(/Unofficial student project/)).toBeTruthy();
  });

  it('renders all four slides including the trust promises', () => {
    const { getByText } = renderScreen();
    // Slides are all mounted in the horizontal pager
    expect(getByText('Everything in four tabs')).toBeTruthy();
    expect(getByText('Your data stays yours')).toBeTruthy();
    expect(getByText(/Zero tracking/)).toBeTruthy();
    expect(getByText('Read the full privacy statement')).toBeTruthy();
    expect(getByText('Ready in one step')).toBeTruthy();
  });

  it('Skip completes onboarding: persists the flag and flips the store', async () => {
    const { getByText } = renderScreen();
    await act(async () => fireEvent.press(getByText('Skip')));
    await waitFor(async () => {
      expect(useStore.getState().onboarded).toBe(true);
      expect(await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED)).toBeTruthy();
    });
  });

  it('the trust slide links to the Datenschutz screen', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Read the full privacy statement'));
    expect(navigation.navigate).toHaveBeenCalledWith('Datenschutz');
  });
});
