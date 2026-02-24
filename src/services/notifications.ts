/**
 * Push notification service using expo-notifications + Firebase Cloud Messaging.
 *
 * How it works:
 *  1. On launch, we request permission and get an Expo Push Token (wraps FCM token).
 *  2. We store that token in Firebase under the user's profile.
 *  3. When a message is sent, we trigger a Cloud Function (or call FCM directly
 *     via the partner's token) to deliver the notification.
 *
 * NOTE: Sending notifications SERVER-SIDE is strongly recommended.
 *       The `sendPushNotification` helper below calls the Expo Push API directly
 *       from the client as a simple MVP approach. In production, move this to a
 *       Firebase Cloud Function so you never expose FCM server keys in the app.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFcmToken } from './auth';

// Show notifications when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ─── Permission + Token ───────────────────────────────────────────────────────

/**
 * Request notification permissions and register the device for push notifications.
 * Returns the Expo push token string, or null if permission denied / not a device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices.');
    return null;
  }

  // Android needs a notification channel.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('locknote', {
      name:             'LockNote Messages',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#e94560',
      sound:            'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission not granted.');
    return null;
  }

  // Get the Expo push token (this wraps FCM token on Android, APNs on iOS).
  const tokenData = await Notifications.getExpoPushTokenAsync({
    // projectId is your EAS project ID from app.json > extra.eas.projectId
    projectId: 'YOUR_EAS_PROJECT_ID',
  });

  return tokenData.data;
}

// ─── App-level setup (call once in App.tsx) ───────────────────────────────────

/**
 * Wire up notifications: register token and attach listeners.
 * Returns a cleanup function for useEffect.
 */
export function setupNotifications(): () => void {
  // Register token and persist to Firebase.
  // Wrapped in try/catch — getExpoPushTokenAsync throws if the EAS project ID
  // is a placeholder or if running in Expo Go without FCM configured.
  (async () => {
    try {
      const token = await registerForPushNotifications();
      if (!token) return;
      const userId = await AsyncStorage.getItem('locknote_user_id');
      if (userId) {
        await saveFcmToken(userId, token);
        await AsyncStorage.setItem('locknote_push_token', token);
      }
    } catch (err) {
      console.warn('[Notifications] Token registration skipped:', err);
    }
  })();

  // Listen for notifications received while app is foregrounded.
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notification received]', notification);
    // The real-time Firebase listener in HomeScreen handles UI updates,
    // so we don't need to do anything extra here.
  });

  // Listen for user tapping a notification.
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Notification tapped]', response.notification.request.content);
    // TODO: navigate to HomeScreen if not already there.
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

// ─── Send (MVP client-side via Expo Push API) ─────────────────────────────────

/**
 * Send a push notification to the partner via the Expo Push API.
 *
 * IMPORTANT: Move this logic to a Firebase Cloud Function before shipping.
 * Calling an external HTTP API from the client is fine for development,
 * but exposes your server token and bypasses security in production.
 */
export async function sendPushNotification(params: {
  recipientToken: string;
  senderName:     string;
  messagePreview: string;
}): Promise<void> {
  const { recipientToken, senderName, messagePreview } = params;

  const body = {
    to:    recipientToken,
    sound: 'default',
    title: `💌 ${senderName} sent a note`,
    body:  messagePreview.length > 80 ? `${messagePreview.slice(0, 77)}…` : messagePreview,
    data:  { screen: 'Home' },
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: {
        Accept:         'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[Push notification] Failed to send:', err);
  }
}
