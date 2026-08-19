import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../../theme/ThemeProvider';
import SemesterCalendarScreen from '../../screens/calendar/SemesterCalendarScreen';


// useFocusEffect needs a navigation container; stub it to a no-op so the screen
// can render standalone.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}));

const renderScreen = () =>
  render(
    <PaperProvider>
      <ThemeProvider>
        <SemesterCalendarScreen navigation={{ navigate: jest.fn() }} />
      </ThemeProvider>
    </PaperProvider>
  );

describe('SemesterCalendarScreen', () => {
  it('renders the default Overview tab', () => {
    const { getByText } = renderScreen();
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Key Dates')).toBeTruthy();
  });

  // Regression: KeyDatesTab used `c.mode` without calling useTheme(), so opening
  // the Key Dates tab threw "ReferenceError: c is not defined" and crashed.
  it('opens the Key Dates tab without crashing and shows the filter chips', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Key Dates'));
    // The "All" filter chip only renders once KeyDatesTab mounts successfully.
    expect(getByText('All')).toBeTruthy();
  });
});
