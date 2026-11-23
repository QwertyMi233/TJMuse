import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasSubmissionCompleted, fetchCanvasSnapshot } from '../src/core/canvas-api';
import { homeworkCompleted, homeworkOn, mergeHomework } from '../src/core/homework';
import { isComplete } from '../src/core/calendar';
import { initialData } from '../src/core/defaults';
import { restoreData } from '../src/core/storage';
import { upcomingReminders } from '../src/core/reminders';
import type { CanvasAssignment } from '../src/core/types';

const work: CanvasAssignment = {
  id: '1:2', courseId: '1', courseName: '数学', title: '待完成练习', description: '',
  createdAt: '2026-10-28T00:00:00+08:00', dueAt: '2026-10-31T12:00:00+08:00',
  url: 'https://canvas.tongji.edu.cn/courses/1/assignments/2', submitted: false, completed: false,
};

test('Canvas grades without a real submission, upcoming work and reassigned work stay unchecked', () => {
  for (const submission of [
    { workflow_state: 'unsubmitted' },
    { workflow_state: 'graded', submitted_at: null, score: 0, grade: '0' },
    { workflow_state: 'graded', submitted_at: 'invalid', score: 100 },
    { workflow_state: 'graded', submitted_at: null, excused: true },
    { workflow_state: 'graded', submitted_at: '2026-10-28T00:00:00Z', missing: true },
    { workflow_state: 'graded', submitted_at: '2026-10-28T00:00:00Z', late_policy_status: 'missing' },
    { workflow_state: 'submitted', submitted_at: '2026-10-28T00:00:00Z', redo_request: true },
    { workflow_state: 'unsubmitted', submitted_at: '2026-10-28T00:00:00Z' },
  ]) assert.equal(canvasSubmissionCompleted(submission), false, JSON.stringify(submission));
  for (const state of ['submitted', 'pending_review']) assert.equal(canvasSubmissionCompleted({ workflow_state: state }), true);
  assert.equal(canvasSubmissionCompleted({ workflow_state: 'graded', submitted_at: '2026-10-28T00:00:00Z' }), true);
  for (const missing of [null, undefined, {}, { workflow_state: 'unknown' }]) assert.equal(canvasSubmissionCompleted(missing), null);
});

test('Canvas snapshot uses the current student submission, not a grade or another student submission', async () => {
  const transport: typeof fetch = async input => {
    const url = String(input);
    const value = url.endsWith('/profile') ? { id: 10 }
      : url.includes('/courses?') ? [{ id: 1, name: '数学' }]
        : [
          { id: 2, name: '即将到来的作业', due_at: work.dueAt, has_submitted_submissions: true, submission: { workflow_state: 'graded', submitted_at: null, score: 0 } },
          { id: 3, name: '自己已提交', submission: { workflow_state: 'graded', submitted_at: '2026-10-28T00:00:00Z' } },
          { id: 4, name: '别人已提交', has_submitted_submissions: true, submission: { workflow_state: 'unsubmitted' } },
        ];
    return new Response(JSON.stringify(value));
  };
  const result = await fetchCanvasSnapshot('https://canvas.tongji.edu.cn', 'test', undefined, transport);
  assert.deepEqual(result.assignments.map(a => a.submitted), [false, true, false]);
  assert.deepEqual(result.assignments.map(homeworkCompleted), [false, true, false]);
});

test('explicit check and uncheck both override Canvas across every visible day and reload', () => {
  for (const submitted of [false, true, null]) for (const completedOverride of [false, true]) {
    const data = structuredClone(initialData);
    data.canvas.assignments = [{ ...work, submitted, completedOverride }];
    const restored = restoreData(JSON.parse(JSON.stringify(data)));
    const assignment = restored.canvas.assignments[0]!;
    assert.equal(homeworkCompleted(assignment), completedOverride);
    for (const day of ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']) {
      const item = homeworkOn([assignment], day)[0]!;
      assert.equal(isComplete(item, day), completedOverride);
      assert.equal(item.canvasSubmitted, submitted === true);
    }
  }
});

test('sync keeps explicit false/true but refreshes automatic status and repairs a historic false positive', () => {
  for (const completedOverride of [false, true]) for (const submitted of [false, true, null]) {
    const previous = { ...work, submitted: true, completedOverride };
    const incoming = { ...work, submitted };
    const merged = mergeHomework([previous], [incoming])[0]!;
    assert.equal(merged.submitted, submitted);
    assert.equal(merged.completedOverride, completedOverride);
    assert.equal(homeworkCompleted(merged), completedOverride);
  }
  const corrected = mergeHomework([{ ...work, submitted: true }], [work])[0]!;
  assert.equal(homeworkCompleted(corrected), false);
  assert.equal(corrected.completedOverride, undefined);
  const submittedLater = mergeHomework([corrected], [{ ...work, submitted: true }])[0]!;
  assert.equal(homeworkCompleted(submittedLater), true);
  assert.equal(submittedLater.completedOverride, undefined);
  const migrated = mergeHomework([{ ...work, completed: true }], [work])[0]!;
  assert.equal(migrated.completedOverride, true);
});

test('unchecking a submitted assignment restores its deadline reminder; checking cancels it', () => {
  const data = structuredClone(initialData);
  data.settings.homeworkNotifications = true;
  data.canvas.assignments = [{ ...work, submitted: true }];
  const now = new Date('2026-10-30T00:00:00+08:00');
  assert.equal(upcomingReminders(data, now).length, 0);
  data.canvas.assignments[0]!.completedOverride = false;
  assert.equal(upcomingReminders(data, now).length, 1);
  data.canvas.assignments[0]!.completedOverride = true;
  assert.equal(upcomingReminders(data, now).length, 0);
});
