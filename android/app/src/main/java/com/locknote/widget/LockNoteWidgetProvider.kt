package com.locknote.widget

/**
 * LockNoteWidgetProvider — bridges Android AppWidget lifecycle to React Native.
 *
 * We extend RNWidgetProvider from react-native-android-widget.
 * It handles onUpdate / onAppWidgetOptionsChanged / onDeleted by dispatching
 * the corresponding events to the JS widgetTaskHandler via the Headless JS API.
 *
 * You do NOT need to override anything here for basic usage.
 * Custom click handling or deep links can be added by overriding onReceive().
 *
 * Registration in AndroidManifest.xml (added by plugin/withAndroidWidget.js):
 *   <receiver
 *       android:name=".widget.LockNoteWidgetProvider"
 *       android:exported="true"
 *       android:label="LockNote Widget">
 *     <intent-filter>
 *       <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
 *     </intent-filter>
 *     <meta-data
 *         android:name="android.appwidget.provider"
 *         android:resource="@xml/lock_note_widget_info" />
 *   </receiver>
 */

import com.sAleksovski.reactNativeAndroidWidget.RNWidgetProvider

class LockNoteWidgetProvider : RNWidgetProvider()
