import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../../theme/ThemeProvider';
import WasteGuideScreen from '../../screens/waste/WasteGuideScreen';

// analytics imports the Supabase client, which cannot construct under Jest
// (no EXPO_PUBLIC_* env). It is a no-op in __DEV__ anyway.
jest.mock('../../services/analytics', () => ({ trackScreen: jest.fn() }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const renderScreen = () =>
  render(
    <PaperProvider>
      <ThemeProvider>
        <WasteGuideScreen />
      </ThemeProvider>
    </PaperProvider>
  );

describe('WasteGuideScreen', () => {
  it('renders the bin tiles when the query is empty', () => {
    const { getByText } = renderScreen();
    expect(getByText('Where does it go?')).toBeTruthy();
    expect(getByText('Yellow Bag')).toBeTruthy();
    expect(getByText('Deposit Return')).toBeTruthy();
  });

  it('shows live results while typing and opens the answer card', () => {
    const { getByPlaceholderText, getByText, getAllByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Type what you want to throw away…'), 'pizza');
    expect(getByText('Pizza box')).toBeTruthy();

    fireEvent.press(getByText('Pizza box'));
    expect(getByText('Goes to')).toBeTruthy();
    // Split-destination variants are shown on the answer card
    expect(getByText('Clean parts')).toBeTruthy();
    expect(getByText('Greasy / cheese-stained parts')).toBeTruthy();
    expect(getAllByText(/Paper Bin/).length).toBeGreaterThan(0);
  });

  it('shows the empty state for nonsense queries', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(
      getByPlaceholderText('Type what you want to throw away…'),
      'xyzzynotathing'
    );
    expect(getByText('No match for “xyzzynotathing”')).toBeTruthy();
  });

  it('opens the bin detail sheet from a tile', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Organic Bin'));
    expect(getByText('What belongs here')).toBeTruthy();
    expect(getByText('Never in here')).toBeTruthy();
  });
});
