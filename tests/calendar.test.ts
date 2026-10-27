import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, parseDate, daysBetween, occursOn, tasksOn, toggleDate, weekDates } from '../src/core/calendar';
import { upcomingReminders } from '../src/core/reminders';
import { initialData } from '../src/core/defaults';
import type { Task } from '../src/core/types';
const base: Task = { id: 'a', title: '复习', description: '', location: '', date: '2026-10-26', time: '09:00', duration: 30, color: '#AAC4B5', kind: 'todo', repeat: null, subtasks: [], completedDates: [] };
test('local calendar keys survive timezone conversion, including DST boundary dates', () => {
  for (const key of ['2026-03-08', '2026-11-01', '2026-12-31', '2028-02-29']) assert.equal(dateKey(parseDate(key)), key);
  assert.equal(daysBetween(parseDate('2026-03-07'), parseDate('2026-03-09')), 2);
});
test('week starts can be Monday or Sunday across a year boundary', () => {
  assert.equal(dateKey(weekDates(parseDate('2027-01-01'), 1)[0]!), '2026-12-28');
  assert.equal(dateKey(weekDates(parseDate('2027-01-01'), 0)[0]!), '2026-12-27');
});
test('one-off tasks only appear on their scheduled day and sort by time', () => {
  assert.equal(occursOn(base, '2026-10-26'), true);
  assert.equal(occursOn(base, '2026-10-27'), false);
  assert.deepEqual(tasksOn([base, { ...base, id: 'b', time: '08:00' }], base.date).map(t => t.id), ['b', 'a']);
});
test('interval days and interval weeks honor the start date and selected weekdays', () => {
  const daily = { ...base, repeat: { interval: 3, unit: 'day' as const, weekdays: [], weekStartsOn: 1 as const } };
  assert.equal(occursOn(daily, '2026-10-29'), true);
  assert.equal(occursOn(daily, '2026-10-28'), false);
  assert.equal(occursOn(daily, '2026-10-23'), false);
  const weekly = { ...base, repeat: { interval: 2, unit: 'week' as const, weekdays: [1, 3], weekStartsOn: 1 as const } };
  assert.equal(occursOn(weekly, '2026-10-28'), true);
  assert.equal(occursOn(weekly, '2026-11-02'), false);
  assert.equal(occursOn(weekly, '2026-11-09'), true);
  assert.equal(occursOn(weekly, '2026-11-10'), false);
});
test('monthly and yearly recurrences clamp to the last day without shifting the anchor', () => {
  const monthly = { ...base, date: '2026-01-31', repeat: { interval: 1, unit: 'month' as const, weekdays: [], weekStartsOn: 1 as const } };
  assert.equal(occursOn(monthly, '2026-02-28'), true);
  assert.equal(occursOn(monthly, '2026-03-28'), false);
  assert.equal(occursOn(monthly, '2026-03-31'), true);
  const yearly = { ...monthly, date: '2024-02-29', repeat: { ...monthly.repeat, unit: 'year' as const } };
  assert.equal(occursOn(yearly, '2026-02-28'), true);
  assert.equal(occursOn(yearly, '2028-02-29'), true);
});
test('completion is scoped to an occurrence and can be undone', () => {
  const keys = toggleDate([], '2026-10-26');
  assert.deepEqual(toggleDate(keys, '2026-10-27'), ['2026-10-26', '2026-10-27']);
  assert.deepEqual(toggleDate(keys, '2026-10-26'), []);
});
test('reminders exclude complete and disabled tasks, order by actual reminder time, cap at 48', () => {
  const data = structuredClone(initialData);
  data.settings.todoNotifications = true;
  data.tasks = [{ ...base, date: '2026-10-27', time: '09:00', repeat: { interval: 1, unit: 'day', weekdays: [], weekStartsOn: 1 }, completedDates: ['2026-10-27'] }];
  const reminders = upcomingReminders(data, new Date(2026, 9, 27, 8));
  assert.equal(reminders.length, 48);
  assert.equal(dateKey(reminders[0]!.at), '2026-10-28');
  assert.equal(reminders[0]!.at.getHours(), 8);
  assert.equal(reminders[0]!.at.getMinutes(), 50);
  data.settings.todoNotifications = false;
  assert.equal(upcomingReminders(data).length, 0);
});
