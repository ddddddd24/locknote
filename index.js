import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// Register the Android widget task handler.
// This is the bridge between the native Android widget lifecycle
// (WIDGET_ADDED, WIDGET_UPDATE, etc.) and our React rendering logic.
// It must be registered before the root component.
registerWidgetTaskHandler(widgetTaskHandler);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
