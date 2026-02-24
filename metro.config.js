const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Redirect react-native-android-widget to a no-op stub when running in
// Expo Go or on iOS, where the real native package is not available.
config.resolver.extraNodeModules = {
  'react-native-android-widget': path.resolve(
    __dirname,
    'src/mocks/android-widget-mock.js',
  ),
};

module.exports = config;
