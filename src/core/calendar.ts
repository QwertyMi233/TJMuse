import type { DateKey, Task } from './types';
const pad = (n: number) => String(n).padStart(2, '0');
export function dateKey(date: Date): DateKey { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
export function parseDate(key: DateKey) { const [y = 2000, m = 1, d = 1] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(date: Date, count: number) { const result = new Date(date); result.setDate(result.getDate() + count); return result; }
function serial(date: Date) { return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000; }
export function daysBetween(from: Date, to: Date) { return serial(to) - serial(from); }
export function weekStart(date: Date, startsOn: 0 | 1) { return addDays(date, -((date.getDay() - startsOn + 7) % 7)); }
export function weekDates(date: Date, startsOn: 0 | 1) { return Array.from({ length: 7 }, (_, i) => addDays(weekStart(date, startsOn), i)); }
export function monthWeek(date: Date, startsOn: 0 | 1) { return Math.floor(daysBetween(weekStart(new Date(date.getFullYear(), date.getMonth(), 1, 12), startsOn), date) / 7) + 1; }
export function occursOn(task: Task, key: DateKey): boolean {
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
export function tasksOn(tasks: Task[], key: DateKey) { return tasks.filter(t => occursOn(t, key)).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'zh')); }
export function isComplete(task: Task, key: DateKey) { return task.completedDates.includes(key); }
export function toggleDate(keys: DateKey[], key: DateKey) { return keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]; }
export function minutes(time: string) { const [h = 0, m = 0] = time.split(':').map(Number); return h * 60 + m; }
export function timeLabel(total: number) { return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`; }
export function endTime(time: string, duration: number) { return timeLabel((minutes(time) + duration) % 1440); }
export function validTime(time: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(time); }
export function validDate(key: string) { return /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(parseDate(key)) === key; }
export function dateLabel(key: string) { return parseDate(key).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }); }
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const CN_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
