import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dose-reminders', {
      name: 'Dose Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D6B5E',
    });
    await Notifications.setNotificationChannelAsync('telehealth-calls', {
      name: 'Incoming Video Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#0D6B5E',
      sound: 'default',
      bypassDnd: true,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.error(
        '[Push] EAS projectId missing — add it to app.json under expo.extra.eas.projectId. ' +
        'Run: npx eas init   to link this project and populate the ID automatically.'
      );
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('[Push] Token obtained:', token);

    const { error: upsertErr } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertErr) {
      console.error('[Push] Failed to store token:', upsertErr.message);
      return null;
    }

    console.log('[Push] Token stored for user', userId);
    return token;
  } catch (err) {
    console.error('[Push] Registration error:', err);
    return null;
  }
}

export async function scheduleDoseReminder(
  prescriptionId: string,
  drugName: string,
  scheduledTime: Date
): Promise<string> {
  const trigger = new Date(scheduledTime);
  if (trigger <= new Date()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to take your medication',
      body: `Take your ${drugName} now`,
      data: { prescriptionId, type: 'dose_reminder' },
      categoryIdentifier: 'dose_reminder',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });

  return identifier;
}

export async function cancelDoseReminder(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function setupNotificationHandlers(): void {
  Notifications.setNotificationCategoryAsync('dose_reminder', [
    {
      identifier: 'TAKE_NOW',
      buttonTitle: 'Take Now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE_15',
      buttonTitle: 'Snooze 15 min',
      options: { opensAppToForeground: false },
    },
  ]);
}
