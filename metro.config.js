// Standard Expo Metro config. Extends expo/metro-config so the project uses
// Expo's default transformer/resolver (the recommended setup).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
