import { SLOTS } from '@/data/menu';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go (SDK 57) does not ship the native modules expo-notifications needs. */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * Loads expo-notifications lazily. Some Expo Go builds miss its native modules, and a
 * top-level import would crash the whole app. If loading fails, notifications are skipped
 * and the in-app banner is used instead.
 */
function getNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web' || isExpoGo) return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as NotificationsModule;
    // Foreground events use the in-app banner, so the OS banner is only for background.
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

/** Asks for permission and schedules one daily "any food left?" local prompt per meal slot. */
export async function setupNotifications() {
  const Notifications = getNotifications();
  if (!Notifications) return;
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
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // Ignore.
  }
}
