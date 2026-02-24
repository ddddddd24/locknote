/**
 * Firebase configuration — replace all YOUR_* values with your real credentials.
 * Find them at: Firebase Console → Project Settings → General → Your apps
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey:            "AIzaSyAng0j41qhJvElB4AZPNDvxrbkLUn602Dg",
  authDomain:        "locknote-7ef32.firebaseapp.com",
  databaseURL:       "https://locknote-7ef32-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "locknote-7ef32",
  storageBucket:     "locknote-7ef32.firebasestorage.app",
  messagingSenderId: "1001784957484",
  appId:             "1:1001784957484:web:e98ead5a43d193e7428f89"
};

// Avoid re-initializing on hot-reload.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Database = getDatabase(app);

// NOTE: Firebase Messaging (FCM) is handled entirely through expo-notifications
// on the native side — we don't need the firebase/messaging web SDK here.

export default app;
