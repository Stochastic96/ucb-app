// Global Jest setup for the UCB Navigator test suite.
//
// jest-expo handles most of the React Native / Expo module surface. We add the
// official AsyncStorage mock (an in-memory store) and silence the noisy logger
// console output so test runs stay readable.

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// @expo/vector-icons is provided by the Expo bundler at runtime and isn't a
// resolvable node_modules package under Jest. Stand it in with simple Text-based
// icons so components that render Ionicons et al. can be tested.
jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { Text } = require('react-native');
    const makeIcon = () => (props) =>
      React.createElement(Text, { ...props, accessibilityLabel: props.name }, props.name);
    return new Proxy({}, { get: () => makeIcon() });
  },
  { virtual: true }
);

// services/logger.js writes to console on every call. Keep test output clean
// while still allowing assertions on console if a test opts in.
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'debug').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
