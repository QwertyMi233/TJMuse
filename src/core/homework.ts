import type { CanvasAssignment, Task, TaskOccurrence, Settings, HomeworkPreference } from './types';
import { dateKey, clockTime, tasksOn, validDate } from './calendar';
const validTimestamp = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
export type HomeworkDisplaySettings = Pick<Settings, 'showHomeworkInTodo' | 'showDatedHomeworkByDefault' | 'showUndatedHomeworkByDefault'>;
export const HOMEWORK_DISPLAY_DEFAULTS: HomeworkDisplaySettings = { showHomeworkInTodo: true, showDatedHomeworkByDefault: true, showUndatedHomeworkByDefault: false };
// Both explicit choices win over Canvas. In particular, false must survive sync.
export function homeworkCompleted(assignment: CanvasAssignment): boolean {
  return typeof assignment.completedOverride === 'boolean' ? assignment.completedOverride : assignment.completed || assignment.submitted === true;
}
export function homeworkVisible(assignment: CanvasAssignment, settings: HomeworkDisplaySettings = HOMEWORK_DISPLAY_DEFAULTS, preference?: HomeworkPreference) {
  if (!settings.showHomeworkInTodo || preference?.deleted || preference?.temporaryDisabled || preference?.visibility === 'hide') return false;
  if (preference?.visibility === 'show') return true;
  return validTimestamp(assignment.dueAt) ? settings.showDatedHomeworkByDefault : settings.showUndatedHomeworkByDefault;
}
export function homeworkStart(assignment: CanvasAssignment) {
  for (const [value, source] of [[assignment.unlockAt, '开放'], [assignment.createdAt, '创建'], [assignment.firstSeenAt, '首次同步'], [assignment.dueAt, '仅截止时间']] as const) {
    const at = validTimestamp(value);
    if (at) return { at, source };
  }
  return null;
}
export function homeworkWindow(assignment: CanvasAssignment) {
  const end = validTimestamp(assignment.dueAt), start = homeworkStart(assignment);
  if (!end || !start) return null;
  // Legacy data may first be seen after its deadline. Keep that historic deadline visible.
  return { start: start.at <= end ? start.at : end, end, source: start.at <= end ? start.source : '仅截止时间' };
}
export function homeworkStartText(assignment: CanvasAssignment) {
  const start = homeworkStart(assignment);
  return start && start.source !== '仅截止时间' ? `${start.source}：${dateKey(start.at)} ${clockTime(start.at)}` : '开始：待同步获取';
}
export function mergeHomework(previous: CanvasAssignment[], incoming: CanvasAssignment[], firstSeenFallback?: string | null): CanvasAssignment[] {
  const known = new Map(previous.map(a => [a.id, a]));
  return incoming.map(a => {
    const old = known.get(a.id);
    const completedOverride = typeof old?.completedOverride === 'boolean' ? old.completedOverride : old?.completed ? true : undefined;
    return { ...a, completed: completedOverride === true, completedOverride,
      firstSeenAt: old?.firstSeenAt || (old ? firstSeenFallback : null) || a.firstSeenAt };
  });
}
// A deadline-only projection is reserved for notifications; list visibility uses homeworkOn.
export function homeworkDeadlineTasks(assignments: CanvasAssignment[]): Task[] {
  return assignments.flatMap(a => {
    if (!a.dueAt || !Number.isFinite(new Date(a.dueAt).getTime())) return [];
    const due = new Date(a.dueAt), date = dateKey(due);
    return [{ id: a.platform&&a.platform!=='canvas' ? a.id : `canvas:${a.id}`, homeworkId: a.id, homeworkPlatform: a.platform || 'canvas', homeworkDueAt: a.dueAt, canvasSubmitted: a.submitted === true, title: a.title, description: a.description,
      location: a.courseName, date, time: clockTime(due), duration: 1, color: '#A8C9EB', kind: 'todo' as const, repeat: null, subtasks: [], completedDates: homeworkCompleted(a) ? [date] : [] }];
  });
}
export function homeworkOn(assignments: CanvasAssignment[], date: string, settings: HomeworkDisplaySettings = HOMEWORK_DISPLAY_DEFAULTS, preferences: Record<string, HomeworkPreference> = {}): TaskOccurrence[] {
  if (!validDate(date)) return [];
  return assignments.flatMap(a => {
    if (!homeworkVisible(a, settings, preferences[a.id])) return [];
    const window = homeworkWindow(a);
    const start = window?.start || homeworkStart(a)?.at;
    if (!start) return [];
    const startDate = dateKey(start), endDate = window ? dateKey(window.end) : date;
    // Assignment windows include both calendar dates, even a deadline at 00:00.
    if (date < startDate || date > endDate) return [];
    const startTime = clockTime(start), endTime = window ? clockTime(window.end) : '24:00';
    return [{ id: a.platform&&a.platform!=='canvas' ? a.id : `canvas:${a.id}`, homeworkId: a.id, homeworkPlatform: a.platform || 'canvas', homeworkDueAt: a.dueAt || undefined, canvasSubmitted: a.submitted === true,
      title: a.title, description: a.description, location: a.courseName, date: startDate, time: startTime,
      duration: 1, color: '#A8C9EB', kind: 'todo' as const, repeat: null, subtasks: [], completedDates: homeworkCompleted(a) ? [startDate] : [],
      occurrenceDate: startDate, endDate, endTime, dayStartTime: date === startDate ? startTime : window && date === endDate ? endTime : '00:00',
      dayEndTime: window && date === endDate ? endTime : '24:00', isContinuation: date > startDate, continuesTomorrow: !window || date < endDate }];
  }).sort((a,b) => a.dayStartTime.localeCompare(b.dayStartTime) || (a.homeworkDueAt || '9999').localeCompare(b.homeworkDueAt || '9999') || a.title.localeCompare(b.title,'zh'));
}
export function dailyTasks(tasks: Task[], assignments: CanvasAssignment[], date: string, placement: Settings['homeworkPlacement'], settings: HomeworkDisplaySettings = HOMEWORK_DISPLAY_DEFAULTS, preferences: Record<string, HomeworkPreference> = {}): TaskOccurrence[] {
  const regular = tasksOn(tasks, date), homework = homeworkOn(assignments, date, settings, preferences);
  if (placement === 'top') return [...homework, ...regular];
  if (placement === 'bottom') return [...regular, ...homework];
  return [...regular, ...homework].sort((a, b) => a.dayStartTime.localeCompare(b.dayStartTime) || a.title.localeCompare(b.title, 'zh'));
}
