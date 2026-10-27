import type { AppData } from './types';
import { addDays, dateKey, parseDate, tasksOn, isComplete } from './calendar';
export function upcomingReminders(data: AppData, now = new Date()) {
  const reminders: { id: string; title: string; body: string; at: Date }[] = [];
  for (let i = 0; i < 60; i++) {
    const key = dateKey(addDays(now, i));
    for (const task of tasksOn(data.tasks, key)) {
      if (isComplete(task, key) || !(task.kind === 'todo' ? data.settings.todoNotifications : data.settings.courseNotifications)) continue;
      const at = parseDate(key);
      const [h = 0, m = 0] = task.time.split(':').map(Number);
      at.setHours(h, m - data.settings.reminderMinutes, 0, 0);
      if (at <= now) continue;
      reminders.push({ id: `tjmuse:${task.id}:${key}`, title: task.title, body: `${task.time}${task.location ? ` · ${task.location}` : ''}${task.description ? `\n${task.description}` : ''}`, at });
    }
  }
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 48);
}
