/**
 * Firebase configuration.
 *
 * Replace ALL placeholder values with your real Firebase project credentials.
 * You can find these in:
 *   Firebase Console → Project Settings → General → Your apps → SDK setup
 *
 * For Android: also download google-services.json and place it at project root.
 * For iOS: also download GoogleService-Info.plist and place it at project root.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAng0j41qhJvElB4AZPNDvxrbkLUn602Dg",
  authDomain: "locknote-7ef32.firebaseapp.com",
  databaseURL: "https://locknote-7ef32-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "locknote-7ef32",
  storageBucket: "locknote-7ef32.firebasestorage.app",
  messagingSenderId: "1001784957484",
  appId: "1:1001784957484:web:e98ead5a43d193e7428f89"
};

// Avoid re-initializing on hot-reload.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Database = getDatabase(app);

// Messaging is only available on native (not in Expo Go without dev client).
let messaging: Messaging | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {
  // Not supported in this environment (e.g. Expo Go without FCM config).
});

export { messaging };
export default app;
