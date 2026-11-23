import { regularTasksOn } from './timetable';
import type { AppData } from './types';
import { allHomework, allHomeworkPreferences } from './platforms';
import { homeworkDeadlineTasks } from './homework';
import { addDays, dateKey, dateTime, taskEnd, clockTime, startsOn, isComplete } from './calendar';
export function upcomingReminders(data: AppData, now = new Date()) {
  const reminders: { id: string; title: string; body: string; at: Date; category: 'tasks' | 'homework' }[] = [];
  for (let i = 0; i < 60; i++) {
    const key = dateKey(addDays(now, i));
    for (const task of [...regularTasksOn(data, key), ...homeworkDeadlineTasks(allHomework(data))]) {
      if (!startsOn(task, key)) continue;
      if (task.homeworkId && (allHomeworkPreferences(data)[task.homeworkId]?.deleted || allHomeworkPreferences(data)[task.homeworkId]?.temporaryDisabled)) continue;
      const enabled = task.homeworkId ? data.settings.homeworkNotifications : task.kind === 'todo' ? data.settings.todoNotifications : data.settings.courseNotifications;
      if (isComplete(task, key) || !enabled) continue;
      const at = new Date(dateTime(key, task.time).getTime() - data.settings.reminderMinutes * 60000);
      if (at <= now) continue;
      const end = taskEnd(task, key), endDate = dateKey(end);
      const time = task.homeworkId ? `作业截止 ${key} ${task.time}` : endDate === key ? task.time : `${key} ${task.time} → ${endDate} ${clockTime(end)}`;
      reminders.push({ id: `tjmuse:${task.id}:${key}`, title: task.title, body: `${time}${task.location ? ` · ${task.location}` : ''}${task.description ? `\n${task.description}` : ''}`, at, category: task.homeworkId ? 'homework' : 'tasks' });
    }
  }
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 48);
}
