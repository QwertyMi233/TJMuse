import type { DateKey, Task, TaskOccurrence } from './types';
export const MAX_TASK_MINUTES = 365 * 24 * 60;
const pad = (n: number) => String(n).padStart(2, '0');
export function dateKey(date: Date): DateKey { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
export function parseDate(key: DateKey) { const [y = 2000, m = 1, d = 1] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(date: Date, count: number) { const result = new Date(date); result.setDate(result.getDate() + count); return result; }
function serial(date: Date) { return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000; }
export function daysBetween(from: Date, to: Date) { return serial(to) - serial(from); }
export function weekStart(date: Date, startsOn: 0 | 1) { return addDays(date, -((date.getDay() - startsOn + 7) % 7)); }
export function weekDates(date: Date, startsOn: 0 | 1) { return Array.from({ length: 7 }, (_, i) => addDays(weekStart(date, startsOn), i)); }
export function semesterWeek(date: Date, firstWeekDate: DateKey | null, startsOn: 0 | 1): number | null {
  if (!firstWeekDate || !validDate(firstWeekDate)) return null;
  const weeks = daysBetween(weekStart(parseDate(firstWeekDate), startsOn), weekStart(date, startsOn)) / 7;
  return weeks < 0 ? null : weeks + 1;
}
// Recurrence rules describe start dates; a continuation must not start a new instance.
export function startsOn(task: Task, key: DateKey): boolean {
  if (key < task.date) return false;
  if (!task.repeat) return key === task.date;
  const rule = task.repeat;
  if (!Number.isInteger(rule.interval) || rule.interval < 1) return false;
  const start = parseDate(task.date), target = parseDate(key);
  if (rule.unit === 'day') return daysBetween(start, target) % rule.interval === 0;
  if (rule.unit === 'week') {
    const weeks = daysBetween(weekStart(start, rule.weekStartsOn), weekStart(target, rule.weekStartsOn)) / 7;
    return weeks % rule.interval === 0 && rule.weekdays.includes(target.getDay());
  }
  const months = (target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth();
  const clampedDay = Math.min(start.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
  if (rule.unit === 'month') return months % rule.interval === 0 && target.getDate() === clampedDay;
  return (target.getFullYear() - start.getFullYear()) % rule.interval === 0 && target.getMonth() === start.getMonth() && target.getDate() === clampedDay;
}
export function dateTime(key: DateKey, time: string) {
  const result = parseDate(key), [h = 0, m = 0] = time.split(':').map(Number);
  result.setHours(h, m, 0, 0);
  return result;
}
export function clockTime(date: Date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }
export function taskEnd(task: Pick<Task, 'date' | 'time' | 'duration'>, occurrenceDate = task.date) {
  return new Date(dateTime(occurrenceDate, task.time).getTime() + task.duration * 60000);
}
export function durationBetween(startDate: DateKey, startTime: string, endDate: DateKey, endTime: string) {
  return (dateTime(endDate, endTime).getTime() - dateTime(startDate, startTime).getTime()) / 60000;
}
function occurrenceForDay(task: Task, occurrenceDate: DateKey, key: DateKey): TaskOccurrence | null {
  const start = dateTime(occurrenceDate, task.time), end = taskEnd(task, occurrenceDate);
  const dayStart = dateTime(key, '00:00'), dayEnd = addDays(dayStart, 1);
  // End is exclusive: a task ending at 00:00 occupies no time on the next day.
  if (start >= dayEnd || end <= dayStart) return null;
  return { ...task, occurrenceDate, endDate: dateKey(end), endTime: clockTime(end),
    dayStartTime: start < dayStart ? '00:00' : clockTime(start),
    dayEndTime: end >= dayEnd ? '24:00' : clockTime(end),
    isContinuation: start < dayStart, continuesTomorrow: end > dayEnd,
  };
}
export function taskOccurrencesOn(task: Task, key: DateKey): TaskOccurrence[] {
  if (!validDate(key) || !validDate(task.date) || !validTime(task.time) || key < task.date || !Number.isSafeInteger(task.duration) || task.duration < 1 || task.duration > MAX_TASK_MINUTES) return [];
  if (!task.repeat) {
    const occurrence = occurrenceForDay(task, task.date, key);
    return occurrence ? [occurrence] : [];
  }
  const result: TaskOccurrence[] = [], dayStart = dateTime(key, '00:00');
  // Compare real local timestamps instead of assuming every day contains 1440 minutes.
  const earliest = dayStart.getTime() - task.duration * 60000;
  for (let day = parseDate(key); dateKey(day) >= task.date; day = addDays(day, -1)) {
    const occurrenceDate = dateKey(day);
    if (dateTime(occurrenceDate, task.time).getTime() <= earliest) break;
    if (!startsOn(task, occurrenceDate)) continue;
    const occurrence = occurrenceForDay(task, occurrenceDate, key);
    if (occurrence) result.push(occurrence);
  }
  return result;
}
export function occursOn(task: Task, key: DateKey): boolean { return taskOccurrencesOn(task, key).length > 0; }
export function tasksOn(tasks: Task[], key: DateKey): TaskOccurrence[] {
  return tasks.flatMap(t => taskOccurrencesOn(t, key)).sort((a, b) => a.dayStartTime.localeCompare(b.dayStartTime) || a.occurrenceDate.localeCompare(b.occurrenceDate) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'zh'));
}
export function isComplete(task: Task | TaskOccurrence, key: DateKey) { return task.completedDates.includes('occurrenceDate' in task ? task.occurrenceDate : key); }
export function toggleDate(keys: DateKey[], key: DateKey) { return keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]; }
export function minutes(time: string) { const [h = 0, m = 0] = time.split(':').map(Number); return h * 60 + m; }
export function timeLabel(total: number) { return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`; }
export function endTime(time: string, duration: number) { return timeLabel((minutes(time) + duration) % 1440); }
export function validTime(time: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(time); }
export function validDate(key: string) { return /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(parseDate(key)) === key; }
export function dateLabel(key: string) { return parseDate(key).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }); }
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const CN_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
