import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../../theme/ThemeProvider';
import useStore from '../../store/useStore';
import CampusOnboardingScreen from '../../screens/campus/CampusOnboardingScreen';

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const renderScreen = () =>
  render(
    <PaperProvider>
      <ThemeProvider>
        <CampusOnboardingScreen navigation={navigation} />
      </ThemeProvider>
    </PaperProvider>
  );

describe('CampusOnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ campusProfile: null, language: 'en' });
  });

  it('starts on the consent step and walks through all five steps', async () => {
    const { getByText, getByPlaceholderText, queryByText } = renderScreen();

    // Step 0 — consent
    expect(getByText('Before you start')).toBeTruthy();
    await act(async () => fireEvent.press(getByText('I understand — start')));

    // Step 1 — identity (Continue disabled until a username is entered)
    await waitFor(() => expect(getByText('Who are you?')).toBeTruthy());
    fireEvent.press(getByText('Continue'));
    expect(getByText('Who are you?')).toBeTruthy(); // still here, username missing
    fireEvent.changeText(getByPlaceholderText('e.g. GreenFox'), 'GreenFox');
    fireEvent.changeText(getByPlaceholderText('e.g. Anna Schmidt'), 'Anna Schmidt');
    fireEvent.press(getByText('Continue'));

    // Step 2 — studies
    expect(getByText('What do you study?')).toBeTruthy();
    fireEvent.press(getByText('3')); // semester chip
    fireEvent.press(getByText('Continue'));

    // Step 3 — social
    expect(getByText('How do you want to connect?')).toBeTruthy();
    fireEvent.press(getByText('Language tandem'));
    fireEvent.press(getByText('coffee'));
    fireEvent.press(getByText('Continue'));

    // Step 4 — visibility, finish saves the profile and leaves
    expect(getByText('You decide when to be seen')).toBeTruthy();
    expect(queryByText('Continue')).toBeNull();
    await act(async () => fireEvent.press(getByText('Create profile')));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    const saved = useStore.getState().campusProfile;
    expect(saved.username).toBe('GreenFox');
    expect(saved.realName).toBe('Anna Schmidt');
    expect(saved.semester).toBe(3);
    expect(saved.openTo).toContain('tandem');
    expect(saved.interests).toContain('coffee');
  });
});
