import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallStartedData {
  type: 'call_started';
  appointmentId: string;
  roomUrl: string;
  roomName: string;
  doctorName: string;
}

interface CallEndedData {
  type: 'call_ended';
  appointmentId: string;
}

type NotificationData = CallStartedData | CallEndedData;

function isCallStarted(data: unknown): data is CallStartedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'call_started'
  );
}

function navigateToCall(data: CallStartedData): void {
  router.push({
    pathname: '/(patient)/call',
    params: {
      appointmentId: data.appointmentId,
      roomUrl: data.roomUrl,
      roomName: data.roomName,
      doctorName: data.doctorName,
    },
  });
}

// ─── Background / tapped notification handler ────────────────────────────────
// Called when user taps the notification from the system tray.

export function setupCallNotificationHandler(): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData;
    if (isCallStarted(data)) {
      navigateToCall(data);
    }
  });
}

// ─── Foreground notification handler ─────────────────────────────────────────
// Called when the app is open and a push notification arrives.

export function setupForegroundCallHandler(): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as NotificationData;
    if (!isCallStarted(data)) return;

    Alert.alert(
      'Incoming Video Call',
      `Dr. ${data.doctorName} is ready for your appointment`,
      [
        { text: 'Decline', style: 'cancel' },
        {
          text: 'Join Now',
          onPress: () => navigateToCall(data),
        },
      ],
      { cancelable: false }
    );
  });
}
