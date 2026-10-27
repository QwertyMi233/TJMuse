import { Platform } from 'react-native';
import type { AppData } from '../core/types';
import { upcomingReminders } from '../core/reminders';

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') throw new Error('网页版不支持本地定时通知，请在 iOS 或 Android App 中开启。');
  const N = await import('expo-notifications');
  if (Platform.OS === 'android') await N.setNotificationChannelAsync('tasks', { name: '日程提醒', importance: N.AndroidImportance.HIGH });
  const existing = await N.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === N.IosAuthorizationStatus.PROVISIONAL) return;
  const result = await N.requestPermissionsAsync();
  if (!result.granted && result.ios?.status !== N.IosAuthorizationStatus.PROVISIONAL) throw new Error('通知权限未开启，可在系统设置中允许 TJMuse 发送通知。');
}
let queue: Promise<void> = Promise.resolve();
export function syncNotifications(data: AppData) {
  if (Platform.OS === 'web') return Promise.resolve();
  const perform = async () => {
    const N = await import('expo-notifications');
    N.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
    const pending = await N.getAllScheduledNotificationsAsync();
    await Promise.all(pending.filter(n => n.identifier.startsWith('tjmuse:')).map(n => N.cancelScheduledNotificationAsync(n.identifier)));
    if (!data.settings.todoNotifications && !data.settings.courseNotifications) return;
    const permission = await N.getPermissionsAsync();
    if (!permission.granted && permission.ios?.status !== N.IosAuthorizationStatus.PROVISIONAL) throw new Error('系统通知权限已关闭，请前往系统设置开启。');
    for (const r of upcomingReminders(data)) await N.scheduleNotificationAsync({ identifier: r.id,
      content: { title: r.title, body: r.body, sound: true },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: 'tasks' },
    });
  };
  queue = queue.catch(() => {}).then(perform);
  return queue;
}
