/**
 * Expo Config Plugin — withAndroidWidget
 *
 * Automatically patches AndroidManifest.xml during `expo prebuild` to register
 * the LockNoteWidgetProvider receiver so the OS knows about the widget.
 *
 * You don't run this manually — it's declared in app.json > plugins[].
 *
 * What it adds to <application> in AndroidManifest.xml:
 *
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

const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @returns {import('@expo/config-plugins').ExpoConfig}
 */
module.exports = function withAndroidWidget(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    // Ensure the <application> tag exists.
    if (!manifest.application || !manifest.application[0]) {
      return modConfig;
    }

    const application = manifest.application[0];

    // Initialise the receiver array if absent.
    if (!application.receiver) {
      application.receiver = [];
    }

    // Avoid adding the receiver twice on repeated prebuild runs.
    const alreadyAdded = application.receiver.some(
      (r) => r.$?.['android:name'] === '.widget.LockNoteWidgetProvider',
    );

    if (!alreadyAdded) {
      application.receiver.push({
        $: {
          'android:name':     '.widget.LockNoteWidgetProvider',
          'android:exported': 'true',
          'android:label':    'LockNote Widget',
        },
        // Intent filter: OS calls us when any widget needs updating.
        'intent-filter': [
          {
            action: [
              {
                $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' },
              },
            ],
          },
        ],
        // Meta-data: points to res/xml/lock_note_widget_info.xml
        'meta-data': [
          {
            $: {
              'android:name':     'android.appwidget.provider',
              'android:resource': '@xml/lock_note_widget_info',
            },
          },
        ],
      });
    }

    return modConfig;
  });
};
