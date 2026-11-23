import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreData } from '../src/core/storage';
import { DEFAULT_THEME, initialData } from '../src/core/defaults';

test('0.1.0 upgrades retain tasks and conversations, migrate default colors, and request a semester', () => {
  const saved = { ...structuredClone(initialData), version: 1, tasks: [{ id: 'existing-task' }], messages: [{ id: 'existing-plan', content: '**旧规划**' }],
    settings: { foreground: '#202A24', background: '#F7F8F4', accent: '#416C56', weekStartsOn: 0, aiProfiles: { custom: { baseUrl: 'https://example.test/v1', model: 'my-model', maxTokens: 2048 } } },
  };
  const restored = restoreData(saved);
  assert.equal(restored.version, 2);
  assert.deepEqual(restored.tasks, saved.tasks);
  assert.deepEqual(restored.messages, saved.messages);
  assert.equal(restored.settings.foreground, DEFAULT_THEME.foreground);
  assert.equal(restored.settings.background, '#FFFFFF');
  assert.equal(restored.settings.accent, DEFAULT_THEME.accent);
  assert.equal(restored.settings.semesterStartDate, null);
  assert.equal(restored.settings.weekStartsOn, 0);
  assert.deepEqual(restored.settings.aiProfiles.custom, saved.settings.aiProfiles.custom);
});
test('custom themes survive upgrades and the legacy colors can still be chosen after migration', () => {
  const saved = structuredClone(initialData);
  saved.settings = { ...saved.settings, foreground: '#17243A', background: '#FFF2E8', accent: '#A55D73', semesterStartDate: '2026-09-16' };
  const restored = restoreData({ ...saved, version: 1 });
  assert.equal(restored.settings.foreground, '#17243A');
  assert.equal(restored.settings.background, '#FFF2E8');
  assert.equal(restored.settings.accent, '#A55D73');
  assert.equal(restored.settings.semesterStartDate, '2026-09-16');
  restored.settings.background = '#F7F8F4';
  assert.equal(restoreData(restored).settings.background, '#F7F8F4');
});
test('invalid semester dates reopen setup and unsupported data is not overwritten', () => {
  const saved = structuredClone(initialData);
  saved.settings.semesterStartDate = '2026-02-30';
  assert.equal(restoreData(saved).settings.semesterStartDate, null);
  assert.throws(() => restoreData({ ...saved, version: 3 }), /本地数据/);
  assert.throws(() => restoreData({ ...saved, tasks: null }), /本地数据/);
});
