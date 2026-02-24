import { registerRootComponent } from 'expo';
import App from './App';

// react-native-android-widget requires native modules that don't exist in Expo Go.
// Wrap in try/catch so the app still launches normally for UI development.
try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {
  // Running in Expo Go or iOS — widget handler is skipped.
}

registerRootComponent(App);
