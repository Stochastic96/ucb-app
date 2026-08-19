import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
// Polyfills crypto.getRandomValues so tweetnacl can generate keys/nonces on-device
// (Campus Radar Ed25519/X25519 identity). No-op-safe under Jest (node crypto is used there).
import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
