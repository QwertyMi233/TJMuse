import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, clockTime, dateTime, durationBetween, taskEnd, tasksOn, occursOn, startsOn, isComplete, toggleDate } from '../src/core/calendar';
import { upcomingReminders } from '../src/core/reminders';
import { plannerContext } from '../src/services/ai';
import { initialData } from '../src/core/defaults';
import type { Task } from '../src/core/types';

const overnight: Task = { id: 'night', title: '跨天复习', description: '夜间任务', location: '自习室', date: '2026-10-28', time: '23:30', duration: 90, color: '#A8C9EB', kind: 'todo', repeat: null, subtasks: [{ id: 'sub', title: '整理资料', completedDates: [] }], completedDates: [] };

test('one overnight task occupies both days, with accurate day segments and one stored record', () => {
  const tasks = [overnight];
  const first = tasksOn(tasks, '2026-10-28')[0]!, second = tasksOn(tasks, '2026-10-29')[0]!;
  assert.equal(first.occurrenceDate, '2026-10-28');
  assert.equal(second.occurrenceDate, first.occurrenceDate);
  assert.equal(first.dayStartTime, '23:30');
  assert.equal(first.dayEndTime, '24:00');
  assert.equal(second.dayStartTime, '00:00');
  assert.equal(second.dayEndTime, '01:00');
  assert.equal(second.isContinuation, true);
  assert.equal(second.endDate, '2026-10-29');
  assert.equal(occursOn(overnight, '2026-10-29'), true);
  assert.equal(startsOn(overnight, '2026-10-29'), false);
  assert.equal(tasksOn(tasks, '2026-10-27').length, 0);
  assert.equal(tasksOn(tasks, '2026-10-30').length, 0);
  assert.equal(tasks.length, 1);
  assert.equal('occurrenceDate' in tasks[0]!, false);
});
test('midnight end is exclusive and a later multi-day end includes its last occupied day', () => {
  assert.equal(tasksOn([{ ...overnight, duration: 30 }], '2026-10-29').length, 0);
  const long = { ...overnight, duration: 1530 };
  assert.equal(tasksOn([long], '2026-10-29')[0]!.dayEndTime, '24:00');
  assert.equal(tasksOn([long], '2026-10-30')[0]!.dayEndTime, '01:00');
  assert.equal(tasksOn([long], '2026-10-31').length, 0);
});
test('continuations sort before later same-day starts, including cross-year and leap-day boundaries', () => {
  const morning = { ...overnight, id: 'morning', date: '2026-10-29', time: '08:00', duration: 30 };
  assert.deepEqual(tasksOn([morning, overnight], morning.date).map(t => t.id), ['night', 'morning']);
  assert.equal(tasksOn([{ ...overnight, date: '2026-12-31' }], '2027-01-01')[0]!.endDate, '2027-01-01');
  assert.equal(tasksOn([{ ...overnight, date: '2028-02-28' }], '2028-02-29')[0]!.dayEndTime, '01:00');
});
test('checkboxes and subtasks share the occurrence start date across all covered days', () => {
  const second = tasksOn([overnight], '2026-10-29')[0]!;
  const completed = { ...overnight, completedDates: toggleDate([], second.occurrenceDate), subtasks: overnight.subtasks.map(s => ({ ...s, completedDates: [second.occurrenceDate] })) };
  for (const day of ['2026-10-28', '2026-10-29']) {
    const shown = tasksOn([completed], day)[0]!;
    assert.equal(isComplete(shown, day), true);
    assert.equal(shown.subtasks[0]!.completedDates.includes(shown.occurrenceDate), true);
  }
});
test('overlapping recurring occurrences stay distinct, with independent completion states', () => {
  const daily: Task = { ...overnight, repeat: { unit: 'day', interval: 1, weekdays: [], weekStartsOn: 1 }, completedDates: ['2026-10-28'] };
  const shown = tasksOn([daily], '2026-10-29');
  assert.deepEqual(shown.map(t => t.occurrenceDate), ['2026-10-28', '2026-10-29']);
  assert.equal(isComplete(shown[0]!, '2026-10-29'), true);
  assert.equal(isComplete(shown[1]!, '2026-10-29'), false);
  const monthly: Task = { ...daily, date: '2026-01-31', repeat: { ...daily.repeat!, unit: 'month' } };
  assert.equal(tasksOn([monthly], '2026-03-01')[0]!.occurrenceDate, '2026-02-28');
});
test('overnight reminders only fire for starts, never for carried-over day segments', () => {
  const data = structuredClone(initialData);
  data.settings.todoNotifications = true; data.tasks = [overnight];
  const reminders = upcomingReminders(data, new Date(2026, 9, 28, 8));
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0]!.id, 'tjmuse:night:2026-10-28');
  assert.equal(reminders[0]!.at.getHours(), 23);
  assert.equal(reminders[0]!.at.getMinutes(), 20);
  assert.ok(reminders[0]!.body.includes('2026-10-29 01:00'));
  assert.equal(upcomingReminders(data, new Date(2026, 9, 29, 0)).length, 0);
});
test('AI receives actual dates, occupied time and shared completion for an ongoing task', () => {
  const data = structuredClone(initialData);
  data.tasks = [{ ...overnight, completedDates: ['2026-10-28'], subtasks: overnight.subtasks.map(s => ({ ...s, completedDates: ['2026-10-28'] })) }];
  const context = plannerContext(data, new Date(2026, 9, 29, 0, 15));
  assert.ok(context.includes('"开始日期":"2026-10-28"'));
  assert.ok(context.includes('"结束日期":"2026-10-29"'));
  assert.ok(context.includes('"当日占用开始":"00:00","当日占用结束":"01:00"'));
  assert.ok(context.includes('"跨天续程":true'));
  assert.ok(context.includes('"已完成":true'));
  assert.ok(context.includes('"子任务":[{"名称":"整理资料","已完成":true}]'));
});
test('elapsed durations and overlapping day views remain correct across daylight saving changes', () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const spring = { ...overnight, date: '2026-03-07', duration: 1470 };
    const end = taskEnd(spring);
    assert.equal(dateKey(end), '2026-03-09');
    assert.equal(clockTime(end), '01:00');
    assert.equal(durationBetween(spring.date, spring.time, dateKey(end), clockTime(end)), 1470);
    assert.equal(tasksOn([{ ...spring, repeat: { unit: 'day', interval: 10, weekdays: [], weekStartsOn: 1 } }], '2026-03-09')[0]!.occurrenceDate, spring.date);
    const fall = { ...overnight, date: '2026-10-31', duration: 1470 };
    const fallEnd = taskEnd(fall);
    assert.equal(dateKey(fallEnd), '2026-11-01');
    assert.equal(clockTime(fallEnd), '23:00');
    assert.equal(taskEnd(fall).getTime() - dateTime(fall.date, fall.time).getTime(), 1470 * 60000);
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});
