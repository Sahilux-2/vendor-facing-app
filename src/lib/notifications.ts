import { SLOTS } from '@/data/menu';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const supported = Platform.OS !== 'web';

if (supported) {
  // Foreground events use the in-app banner, so the OS banner is only for background.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

/** Asks for permission and schedules one daily "any food left?" prompt per meal slot. */
export async function setupNotifications() {
  if (!supported) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const s of SLOTS) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${s.label} is over`,
          body: 'Any food left? Log it in one tap.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(s.end / 60),
          minute: s.end % 60,
        },
      });
    }
  } catch {
    // Notifications are best-effort (for example, limited in Expo Go).
  }
}

export async function notifyNow(title: string, body: string) {
  if (!supported) return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // Ignore.
  }
}
