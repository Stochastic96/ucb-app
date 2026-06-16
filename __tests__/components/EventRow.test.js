import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import EventRow from '../../components/EventRow';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('EventRow', () => {
  const baseEvent = {
    courseTitle: 'Databases',
    courseColor: '#2196F3',
    start: '2024-03-13T10:00:00',
    end: '2024-03-13T11:30:00',
    room: 'A101',
  };

  it('renders the course title and a 24h time range', () => {
    const { getByText } = renderWithTheme(<EventRow event={baseEvent} />);
    expect(getByText('Databases')).toBeTruthy();
    expect(getByText('10:00 – 11:30')).toBeTruthy();
  });

  it('omits the room line when no room is provided', () => {
    const { queryByText } = renderWithTheme(
      <EventRow event={{ ...baseEvent, room: undefined }} />
    );
    // room label uses i18n key home_room — with no room, nothing room-like renders
    expect(queryByText(/A101/)).toBeNull();
  });

  it('exposes an accessibility label combining title and time', () => {
    const { getByLabelText } = renderWithTheme(<EventRow event={baseEvent} />);
    expect(getByLabelText(/Databases, 10:00 – 11:30/)).toBeTruthy();
  });
});
