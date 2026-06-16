import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../../theme/ThemeProvider';
import EmptyState from '../../components/EmptyState';

const renderWithProviders = (ui) =>
  render(
    <PaperProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </PaperProvider>
  );

describe('EmptyState', () => {
  it('renders the title and subtitle', () => {
    const { getByText } = renderWithProviders(
      <EmptyState icon="cloud-offline" title="Nothing here" subtitle="Try again later" />
    );
    expect(getByText('Nothing here')).toBeTruthy();
    expect(getByText('Try again later')).toBeTruthy();
  });

  it('renders an action button and fires onAction when pressed', () => {
    const onAction = jest.fn();
    const { getByText } = renderWithProviders(
      <EmptyState title="Empty" actionLabel="Retry" onAction={onAction} />
    );
    fireEvent.press(getByText('Retry'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button without both label and handler', () => {
    const { queryByText } = renderWithProviders(
      <EmptyState title="Empty" actionLabel="Retry" />
    );
    expect(queryByText('Retry')).toBeNull();
  });
});
