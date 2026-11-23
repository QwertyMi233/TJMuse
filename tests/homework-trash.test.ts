import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../src/core/defaults';
import { restoreData } from '../src/core/storage';
import { homeworkOn } from '../src/core/homework';
import { changeHomeworkPreference, cleanHomeworkTrash, HOMEWORK_TRASH_RETENTION_MS, homeworkTrashExpiresAt, mergeCanvasHomework } from '../src/core/homework-trash';
import type { CanvasAssignment, CanvasState } from '../src/core/types';
import { plannerContext } from '../src/services/ai';
import { upcomingReminders } from '../src/core/reminders';

const deletedAt = new Date('2026-10-30T21:30:00+08:00');
const after = (milliseconds: number) => new Date(deletedAt.getTime() + milliseconds);
const assignment: CanvasAssignment = {
  id: '1:1', courseId: '1', courseName: '数学', title: '仅存在于本机的作业正文', description: '应在清空时移除的私有说明',
  createdAt: '2026-10-28T00:00:00+08:00', firstSeenAt: '2026-10-29T00:00:00+08:00', dueAt: '2026-11-10T18:00:00+08:00',
  url: 'https://canvas.tongji.edu.cn/courses/1/assignments/1', submitted: true, completed: false, completedOverride: false,
};
const state = (): CanvasState => ({ ...structuredClone(initialData.canvas), assignments: [structuredClone(assignment)], preferences: { '1:1': { visibility: 'show', deleted: false } } });

test('deleting starts a 72-hour recovery window and repeated deletion does not extend it', () => {
  const original = state();
  const deleted = changeHomeworkPreference(original, assignment.id, { deleted: true }, deletedAt);
  assert.equal(original.preferences[assignment.id]!.deleted, false);
  assert.equal(deleted.preferences[assignment.id]!.deletedAt, deletedAt.toISOString());
  assert.equal(homeworkTrashExpiresAt(deleted.preferences[assignment.id]), after(HOMEWORK_TRASH_RETENTION_MS).getTime());
  assert.equal(homeworkOn(deleted.assignments, '2026-10-30', initialData.settings, deleted.preferences).length, 0);
  const repeated = changeHomeworkPreference(deleted, assignment.id, { deleted: true }, after(3600000));
  assert.equal(repeated.preferences[assignment.id]!.deletedAt, deletedAt.toISOString());
  assert.equal(repeated.assignments[0]!.description, assignment.description);
});

test('restoring before expiry preserves content, individual visibility, and an explicit unchecked choice', () => {
  const deleted = changeHomeworkPreference(state(), assignment.id, { deleted: true }, deletedAt);
  const restored = changeHomeworkPreference(deleted, assignment.id, { deleted: false }, after(HOMEWORK_TRASH_RETENTION_MS - 1));
  assert.deepEqual(restored.preferences[assignment.id], { visibility: 'show', deleted: false });
  assert.deepEqual(restored.assignments, [assignment]);
  assert.equal(homeworkOn(restored.assignments, '2026-10-30', initialData.settings, restored.preferences).length, 1);
  const removedAgain = changeHomeworkPreference(restored, assignment.id, { deleted: true }, after(HOMEWORK_TRASH_RETENTION_MS + 1000));
  assert.equal(removedAgain.preferences[assignment.id]!.deletedAt, after(HOMEWORK_TRASH_RETENTION_MS + 1000).toISOString());
});

test('the exact expiry removes content and leaves only a non-restorable import suppression marker', () => {
  const deleted = changeHomeworkPreference(state(), assignment.id, { deleted: true }, deletedAt);
  assert.equal(cleanHomeworkTrash(deleted, after(HOMEWORK_TRASH_RETENTION_MS - 1)).assignments.length, 1);
  const purged = cleanHomeworkTrash(deleted, after(HOMEWORK_TRASH_RETENTION_MS));
  assert.deepEqual(purged.assignments, []);
  assert.deepEqual(purged.preferences[assignment.id], { visibility: 'default', deleted: true, purged: true });
  assert.equal(JSON.stringify(purged).includes(assignment.title), false);
  assert.equal(JSON.stringify(purged).includes(assignment.description), false);
  assert.equal(JSON.stringify(purged).includes(assignment.url), false);
  assert.equal(homeworkTrashExpiresAt(purged.preferences[assignment.id]), null);
  assert.strictEqual(changeHomeworkPreference(purged, assignment.id, { deleted: false }, after(HOMEWORK_TRASH_RETENTION_MS + 1)), purged);
  assert.strictEqual(cleanHomeworkTrash(purged, after(HOMEWORK_TRASH_RETENTION_MS + 1)), purged);
});

test('manual clearing removes only deleted content and synchronization cannot reintroduce it', () => {
  const live = { ...assignment, id: '1:2', title: '仍在清单中的作业' };
  let canvas = state(); canvas.assignments.push(live);
  canvas = changeHomeworkPreference(canvas, assignment.id, { deleted: true }, deletedAt);
  const purged = cleanHomeworkTrash(canvas, after(1000), true);
  assert.deepEqual(purged.assignments, [live]);
  const synchronized = mergeCanvasHomework(purged, [assignment, { ...live, title: '正常同步更新' }], after(2000));
  assert.equal(synchronized.assignments.length, 1);
  assert.equal(synchronized.assignments[0]!.title, '正常同步更新');
  assert.equal(synchronized.preferences[assignment.id]!.purged, true);
});

test('sync keeps a deleted snapshot and its deadline even when Canvas changes or omits it', () => {
  const deleted = changeHomeworkPreference(state(), assignment.id, { deleted: true }, deletedAt);
  const updated = { ...assignment, title: '学校侧新标题', dueAt: null, completedOverride: undefined };
  const changed = mergeCanvasHomework(deleted, [updated], after(1000));
  assert.deepEqual(changed.assignments, [assignment]);
  assert.equal(changed.preferences[assignment.id]!.deletedAt, deletedAt.toISOString());
  const missing = mergeCanvasHomework(changed, [], after(2000));
  assert.deepEqual(missing.assignments, [assignment]);
  const restored = changeHomeworkPreference(missing, assignment.id, { deleted: false }, after(3000));
  assert.equal(restored.assignments[0]!.title, assignment.title);
  assert.equal(restored.assignments[0]!.completedOverride, false);
});

test('expired or manually purged markers survive restart and filter the next complete snapshot', () => {
  const data = structuredClone(initialData);
  data.canvas = changeHomeworkPreference(state(), assignment.id, { deleted: true }, deletedAt);
  const restored = restoreData(JSON.parse(JSON.stringify(data)), after(HOMEWORK_TRASH_RETENTION_MS));
  assert.equal(restored.canvas.assignments.length, 0);
  assert.equal(restored.canvas.preferences[assignment.id]!.purged, true);
  const again = restoreData(JSON.parse(JSON.stringify(restored)), after(HOMEWORK_TRASH_RETENTION_MS + 1000));
  assert.deepEqual(mergeCanvasHomework(again.canvas, [assignment], after(HOMEWORK_TRASH_RETENTION_MS + 2000)).assignments, []);
});

test('legacy deleted items get a full recovery window on upgrade without restarting it on reload', () => {
  const legacy = structuredClone(initialData); legacy.canvas = state();
  legacy.canvas.preferences[assignment.id] = { visibility: 'show', deleted: true };
  const first = restoreData(JSON.parse(JSON.stringify(legacy)), deletedAt);
  assert.equal(first.canvas.preferences[assignment.id]!.deletedAt, deletedAt.toISOString());
  assert.equal(first.canvas.assignments.length, 1);
  const second = restoreData(JSON.parse(JSON.stringify(first)), after(3600000));
  assert.equal(second.canvas.preferences[assignment.id]!.deletedAt, deletedAt.toISOString());
  assert.equal(second.canvas.assignments.length, 1);
  const expired = restoreData(JSON.parse(JSON.stringify(second)), after(HOMEWORK_TRASH_RETENTION_MS));
  assert.equal(expired.canvas.assignments.length, 0);
});

test('unknown items cannot be restored and invalid deletion timestamps receive a valid recovery date', () => {
  const canvas = state();
  assert.strictEqual(changeHomeworkPreference(canvas, '9:9', { deleted: false }, deletedAt), canvas);
  canvas.preferences[assignment.id] = { visibility: 'hide', deleted: true, deletedAt: 'not-a-timestamp' };
  const cleaned = cleanHomeworkTrash(canvas, deletedAt);
  assert.equal(cleaned.preferences[assignment.id]!.deletedAt, deletedAt.toISOString());
  assert.equal(cleaned.assignments.length, 1);
  const restored = changeHomeworkPreference(cleaned, assignment.id, { deleted: false }, after(1));
  assert.equal(restored.preferences[assignment.id]!.visibility, 'hide');
});

test('an explicitly unchecked submitted assignment returns to planning and deadline reminders across days', () => {
  const data = structuredClone(initialData); data.settings.homeworkNotifications = true;
  data.canvas.assignments = [{ ...assignment, completedOverride: undefined }];
  assert.equal(plannerContext(data, deletedAt).includes(assignment.title), false);
  assert.equal(upcomingReminders(data, deletedAt).length, 0);
  data.canvas.assignments[0]!.completedOverride = false;
  for (const now of [deletedAt, after(86400000)]) {
    assert.equal(plannerContext(data, now).includes(assignment.title), true);
    const reminders = upcomingReminders(data, now);
    assert.equal(reminders.length, 1);
    assert.equal(reminders[0]!.title, assignment.title);
  }
  data.canvas.assignments[0]!.completedOverride = true;
  assert.equal(plannerContext(data, deletedAt).includes(assignment.title), false);
  assert.equal(upcomingReminders(data, deletedAt).length, 0);
});

test('explicit completion choices survive an omitted Canvas snapshot and reappearance after restart', () => {
  for (const choice of [false, true]) {
    const canvas = state(); canvas.assignments[0]!.completedOverride = choice;
    const missing = mergeCanvasHomework(canvas, [], deletedAt);
    assert.equal(missing.assignments.length, 0);
    assert.equal(missing.preferences[assignment.id]!.completedOverride, choice);
    const data = { ...structuredClone(initialData), canvas: missing };
    const restored = restoreData(JSON.parse(JSON.stringify(data)), after(1000));
    const returned = mergeCanvasHomework(restored.canvas, [{ ...assignment, completed: false, completedOverride: undefined }], after(2000));
    assert.equal(returned.assignments[0]!.completedOverride, choice);
    assert.equal(returned.assignments[0]!.completed, choice);
  }
});

test('permanent clearing removes completion preferences as well as the deleted snapshot', () => {
  const canvas = mergeCanvasHomework(state(), [assignment], deletedAt);
  assert.equal(canvas.preferences[assignment.id]!.completedOverride, false);
  const deleted = changeHomeworkPreference(canvas, assignment.id, { deleted: true }, deletedAt);
  const purged = cleanHomeworkTrash(deleted, after(1000), true);
  assert.deepEqual(purged.preferences[assignment.id], { visibility: 'default', deleted: true, purged: true });
  assert.equal(purged.assignments.length, 0);
});
