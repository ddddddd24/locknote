# LockNote — Setup Guide

Complete setup instructions for every platform. Follow in order.

---

## 1 — Prerequisites

| Tool | Minimum version | Install |
|------|-----------------|---------|
| Node | 20+ | https://nodejs.org |
| Watchman | latest | `brew install watchman` (macOS only) |
| Java (JDK) | 17 | Android Studio ships one |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |
| Xcode | 15+ | Mac App Store |
| CocoaPods | 1.14+ | `sudo gem install cocoapods` |
| Expo CLI | latest | `npm i -g expo-cli eas-cli` |

---

## 2 — Firebase setup

1. Go to https://console.firebase.google.com and create a project called **locknote**.
2. Enable **Realtime Database** → Start in **test mode** for development.
3. Enable **Cloud Messaging** (FCM) in Project Settings → Cloud Messaging.
4. Add an **Android app** with package name `com.locknote`.
   - Download `google-services.json` → place it at **project root**.
5. Add an **iOS app** with bundle ID `com.locknote`.
   - Download `GoogleService-Info.plist` → place it at **project root**.
6. Open `src/config/firebase.ts` and replace every `YOUR_*` placeholder with
   your real credentials from Project Settings → General.

### Firebase Realtime Database Security Rules (paste into Firebase console)
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read":  true,
        ".write": true
      }
    },
    "pairs": {
      "$pairId": {
        ".read":  true,
        ".write": true
      }
    },
    "pairCodes": {
      "$code": {
        ".read":  true,
        ".write": true
      }
    },
    "messages": {
      "$pairId": {
        ".read":  true,
        ".write": true
      }
    }
  }
}
```
> Tighten these rules before production: use `auth.uid` to restrict reads/writes.

---

## 3 — Install dependencies

```bash
cd locknote
npm install
```

---

## 4 — Generate native projects

```bash
npx expo prebuild --clean
```

This generates the `android/` and `ios/` directories and applies the config plugin
that registers the Android widget receiver in `AndroidManifest.xml`.

---

## 5 — Android setup

### 5a — Verify widget receiver in AndroidManifest.xml

After prebuild, open `android/app/src/main/AndroidManifest.xml` and confirm
the plugin added this inside `<application>`:

```xml
<receiver
    android:name=".widget.LockNoteWidgetProvider"
    android:exported="true"
    android:label="LockNote Widget">
  <intent-filter>
    <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
  </intent-filter>
  <meta-data
      android:name="android.appwidget.provider"
      android:resource="@xml/lock_note_widget_info" />
</receiver>
```

If it's missing, add it manually.

### 5b — Copy widget resources

The native files were pre-created in this repo. After prebuild they should already
be in the right place. If not, copy them manually:

```
android/app/src/main/res/xml/lock_note_widget_info.xml          ← widget metadata
android/app/src/main/res/layout/lock_note_widget_loading.xml    ← placeholder layout
android/app/src/main/res/values/strings.xml                     ← string resources
android/app/src/main/java/com/locknote/widget/LockNoteWidgetProvider.kt
```

### 5c — Add widget preview drawable (optional but recommended)

Create `android/app/src/main/res/drawable/widget_preview.png`
(or any PNG) — shown in the Android widget picker.
Any 320×200 image works during development.

### 5d — react-native-android-widget link check

The library uses autolinking. Verify in `android/settings.gradle`:
```groovy
include ':react-native-android-widget'
project(':react-native-android-widget').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-android-widget/android')
```
If not present, run `npx react-native link react-native-android-widget`.

### 5e — Build and run

```bash
npx expo run:android
```

Then long-press the home screen → Widgets → search "LockNote" to add the widget.

---

## 6 — iOS setup

### 6a — Add Widget Extension target in Xcode

1. Open `ios/LockNote.xcworkspace` in Xcode (not `.xcodeproj`).
2. **File → New → Target…** → choose **Widget Extension**.
3. Name it exactly `LockNoteWidget`.
4. Bundle identifier: `com.locknote.LockNoteWidget`.
5. Make sure **"Include Live Activity"** and **"Include Configuration Intent"** are **unchecked**.
6. Click **Finish**. When asked to activate the scheme, click **Activate**.

### 6b — Replace generated Swift files

Xcode generates boilerplate Swift files. Replace them with ours:

- Delete the auto-generated `LockNoteWidget.swift` in the target folder.
- Drag `ios/LockNoteWidget/LockNoteWidget.swift` into the Xcode group **LockNoteWidget**
  (make sure "LockNoteWidget" target is checked in the file membership panel, NOT the main app target).
- Do the same for `ios/LockNoteWidget/Info.plist` — but this is usually auto-created by Xcode.
  Just verify the `NSExtensionPointIdentifier` key is `com.apple.widgetkit-extension`.

### 6c — Add WidgetKit framework

1. Select the **LockNoteWidget** target → Build Phases → Link Binary With Libraries.
2. Click `+` → search **WidgetKit** → Add.

### 6d — Enable App Groups (CRITICAL for data sharing)

Both the **main app target (LockNote)** and the **LockNoteWidget** target need the same App Group:

For each target:
1. Select the target → Signing & Capabilities → `+ Capability` → **App Groups**.
2. Click `+` and enter: `group.com.locknote.widget`
3. Make sure it's checked for **both** targets.

### 6e — Pod install

```bash
cd ios && pod install && cd ..
```

### 6f — Build and run

```bash
npx expo run:ios
```

To add the widget on a simulator or device:
- Long press home screen → `+` (top-left) → search "LockNote"
- Add Small or Medium widget.

For lock screen widgets (iOS 16+):
- Long press the lock screen → Customize → Lock Screen → `+`
- Choose "LockNote" from the list.

---

## 7 — Expo Push Notifications (EAS)

1. Create an EAS account at https://expo.dev if you don't have one.
2. ```bash
   eas build:configure
   ```
3. Replace `YOUR_EAS_PROJECT_ID` in:
   - `app.json` → `extra.eas.projectId`
   - `src/services/notifications.ts` → `registerForPushNotifications()`
4. For production, move `sendPushNotification()` to a **Firebase Cloud Function**
   so FCM server keys aren't bundled in the app.

---

## 8 — Running in development

```bash
# Start Metro bundler
npm start

# Android (in another terminal)
npx expo run:android

# iOS (in another terminal)
npx expo run:ios
```

**Note:** Push notifications and widgets require a real device (not a simulator/emulator
for full widget support, though emulators can run the app).

---

## 9 — Known limitations & next steps

| Feature | Status | Notes |
|---------|--------|-------|
| Android home-screen widget | ✅ Implemented | Requires physical device or emulator with Play Services |
| Android lock-screen widget | ⚠️ Partial | Android removed lock-screen widgets in 5.0+; use Notification instead |
| iOS home/lock-screen widget | ✅ Implemented | Requires Xcode target setup (step 6) |
| Push notifications | ✅ Implemented | Move server-side send to Cloud Function for production |
| Drawing in widget | ⚠️ Text-only | RemoteViews (Android) and WidgetKit (iOS) can't render SVG; show a tap prompt |
| Partner online indicator | 🔲 TODO | Add Firebase presence (`/.info/connected`) |
| Message history | 🔲 TODO | Paginate `/messages/{pairId}/history` |
| Unpair / delete account | 🔲 TODO | Add account management screen |
| End-to-end encryption | 🔲 TODO | Encrypt message content before storing in Firebase |

---

## 10 — Project structure

```
locknote/
├── App.tsx                           Root component
├── index.js                          Entry (registers widget handler)
├── app.json                          Expo config
├── plugin/
│   └── withAndroidWidget.js          Config plugin — patches AndroidManifest.xml
├── src/
│   ├── config/firebase.ts            Firebase init (replace credentials)
│   ├── context/AppContext.tsx        Global auth/pair state
│   ├── navigation/AppNavigator.tsx   Stack navigator
│   ├── screens/
│   │   ├── PairingScreen.tsx         First-launch pairing flow
│   │   ├── HomeScreen.tsx            Displays partner's latest note (real-time)
│   │   └── ComposeScreen.tsx         Write text or draw a note
│   ├── components/
│   │   ├── DrawingCanvas.tsx         Finger-painting canvas (SVG)
│   │   └── MessageDisplay.tsx        Renders text or drawing message
│   ├── services/
│   │   ├── auth.ts                   Pairing / user profile
│   │   ├── messages.ts               Send / subscribe to messages
│   │   ├── notifications.ts          Expo push notifications + FCM
│   │   └── widgetBridge.ts           iOS App Group data sharing
│   ├── widgets/
│   │   ├── LockNoteWidget.tsx        Android widget React component
│   │   └── widgetTaskHandler.ts      Android widget lifecycle handler
│   ├── types/index.ts                Shared TypeScript types
│   └── theme.ts                      Colour palette
├── android/
│   └── app/src/main/
│       ├── java/com/locknote/widget/
│       │   └── LockNoteWidgetProvider.kt   Kotlin widget receiver
│       └── res/
│           ├── xml/lock_note_widget_info.xml
│           ├── layout/lock_note_widget_loading.xml
│           └── values/strings.xml
└── ios/
    └── LockNoteWidget/
        ├── LockNoteWidget.swift       SwiftUI widget (all sizes + lock screen)
        └── Info.plist                 Extension target plist
```
