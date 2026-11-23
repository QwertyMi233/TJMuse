import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fetchHaokeSnapshot, haokeDate, haokeClient, renewHaokeCredentials } from '../src/core/haoke-api';
import { initialData } from '../src/core/defaults';
import { allHomework, allHomeworkPreferences, syncConnectedPlatforms } from '../src/core/platforms';
import { restoreData } from '../src/core/storage';
import { cleanHomeworkTrash, changeHomeworkPreference, mergeCanvasHomework } from '../src/core/homework-trash';
import { dailyTasks } from '../src/core/homework';
import { upcomingReminders } from '../src/core/reminders';
import { canvasRenewalDue } from '../src/core/canvas-renewal';
import { CANVAS_ROTATION_SCRIPT } from '../src/services/canvas-rotation-script';
import type { CanvasRenewal } from '../src/core/types';

const json = (data: unknown) => new Response(JSON.stringify({ code: 200, data }));
const row = { taskId: 10, taskName: '预习作业', endTime: '2026-11-02 22:00:00', myStatus: 20 };
function transport(options: { duplicatePage?: boolean; fail?: boolean; returned?: boolean } = {}) {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input), path = new URL(url).pathname, body = JSON.parse(String(init?.body));
    calls.push(path); assert.equal(init?.method, 'POST'); assert.equal(init?.credentials, 'omit');
    assert.match(body.requestId, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    assert.equal((init?.headers as Record<string,string>).Authorization, 'Bearer test-token');
    assert.ok(url.startsWith('https://tongji.aihaoke.net/api/')); assert.ok(!url.includes('test-token'));
    if (path.endsWith('queryCurrentUserInfo')) return json({ userInfo: { userId: 7 } });
    if (path.endsWith('listMyClass')) return json({ teachClassResponseList: [{ classId: 2, instanceId: 3, instanceName: '物理' }] });
    if (path.endsWith('queryClassInfo')) return options.fail ? new Response('error', { status: 503 }) : json({ columnList: [{ columnCode: 'examines' }] });
    if (path.endsWith('examineList')) return json({ totalRowCount: 1, rowList: [{ examineId: 10, examineName: '测验', submitFlag: 0, endTime: '9999-12-31 23:59:59' }] });
    assert.equal(path, '/api/learn/task/listTask');
    if (options.duplicatePage) return json({ totalRowCount: 2, rowList: [row] });
    return json({ totalRowCount: 2, rowList: body.page.pageNo === 1 ? [{ ...row, continueType: options.returned ? 20 : 0 }] : [{ ...row, taskId: 11, taskName: '待完成作业', myStatus: 0 }] });
  };
  return { fetcher, calls };
}
test('Haoke uses fixed read endpoints, paginates, distinguishes tasks and exams, and converts China times', async () => {
  const { fetcher } = transport(), result = await fetchHaokeSnapshot('test-token', fetcher);
  assert.equal(result.userId, '7'); assert.equal(result.assignments.length, 3);
  assert.deepEqual(result.assignments.map(a => a.id), ['haoke:2:10','haoke:2:11','haoke:2:exam:10']);
  assert.equal(result.assignments[0]!.dueAt, '2026-11-02T14:00:00.000Z');
  assert.equal(result.assignments[0]!.submitted, true); assert.equal(result.assignments[1]!.submitted, false);
  assert.equal(result.assignments[2]!.dueAt, null); assert.equal(haokeDate(null), null);
  const returned = await fetchHaokeSnapshot('test-token', transport({ returned: true }).fetcher);
  assert.equal(returned.assignments[0]!.submitted, false);
});
test('Haoke refuses incomplete snapshots, repeated pages and endpoints that could modify work', async () => {
  await assert.rejects(fetchHaokeSnapshot('test-token', transport({ duplicatePage: true }).fetcher), /重复/);
  await assert.rejects(fetchHaokeSnapshot('test-token', transport({ fail: true }).fetcher), /保留/);
  await assert.rejects(haokeClient('test-token', transport().fetcher)('/api/learn/task/deleteTask', {}), /允许列表/);
});
test('Haoke token login returns a recoverable candidate without another request', async () => {
  let calls = 0;
  const next = await renewHaokeCredentials({ token: 'old', ticket: 'old-ticket', userId: '7' }, async (url, init) => {
    calls++; assert.equal(new URL(String(url)).pathname, '/api/auth/tokenLogin');
    const body = JSON.parse(String(init?.body)); assert.equal(body.ticket, 'old-ticket');
    return json({ token: 'new-token', ticket: 'new-ticket' });
  });
  assert.equal(calls, 1); assert.deepEqual(next, { token: 'new-token', ticket: 'new-ticket', userId: '7' });
});
test('aggregated homework has isolated IDs, completion, deletion, migration and reminders', async () => {
  const snapshot = await fetchHaokeSnapshot('test-token', transport().fetcher), data = structuredClone(initialData);
  data.haoke = { ...data.haoke, connected: true, userId: snapshot.userId, assignments: snapshot.assignments };
  data.canvas.assignments = [{ ...snapshot.assignments[1]!, platform: 'canvas', id: '2:11', title: 'Canvas 作业' }];
  data.settings.homeworkNotifications = true;
  // First sync is after creation in this fixture: set explicit starts for the date view.
  for (const a of allHomework(data)) a.createdAt = '2026-10-01T00:00:00+08:00';
  assert.equal(dailyTasks([], allHomework(data), '2026-11-02', 'timeline', data.settings, allHomeworkPreferences(data)).length, 3);
  const now = new Date('2026-11-01T08:00:00+08:00');
  data.haoke = changeHomeworkPreference(data.haoke, 'haoke:2:11', { deleted: true }, now);
  assert.equal(upcomingReminders(data, now).some(r => r.title === '待完成作业'), false);
  assert.equal(upcomingReminders(data, now).some(r => r.title === 'Canvas 作业'), true);
  const restored = restoreData(JSON.parse(JSON.stringify(data)), now);
  assert.equal(restored.haoke.preferences['haoke:2:11']!.deleted, true);
  restored.haoke = cleanHomeworkTrash(restored.haoke, now, true);
  restored.haoke = mergeCanvasHomework(restored.haoke, snapshot.assignments, now);
  assert.equal(restored.haoke.assignments.some(a => a.id === 'haoke:2:11'), false);
  assert.equal(restored.canvas.assignments.length, 1);
  assert.equal(restoreData({ ...data, haoke: undefined }).haoke.connected, false);
});
test('sync all isolates platform failures and skips disconnected platforms', async () => {
  let count = 0;
  const result = await syncConnectedPlatforms({ canvas: true, haoke: true,zhixuemeng:false }, { canvas: async () => { throw new Error('测试失败'); }, haoke: async () => { count++; },zhixuemeng:async()=>{throw Error('must skip');} });
  assert.equal(count, 1); assert.deepEqual(result.map(r => r.status), ['failed','success','skipped']);
  const skipped = await syncConnectedPlatforms({ canvas: false, haoke: true,zhixuemeng:false }, { canvas: async () => { throw new Error(); }, haoke: async () => {},zhixuemeng:async()=>{throw Error('must skip');} });
  assert.equal(skipped[0]!.status, 'skipped');
});
test('renewal respects a 30-minute interval, expiry, cooldown and the explicit stop/login states', () => {
  const now = new Date('2026-10-30T12:00:00Z').getTime();
  const config: CanvasRenewal = { enabled: true, tokenId: '7', purpose: 'TJMuse', accountId: '42', status: 'ready', message: '', lastAttempt: null, lastRotated: new Date(now - 30 * 60000).toISOString(), expiresAt: null };
  assert.equal(canvasRenewalDue(config, now), true);
  assert.equal(canvasRenewalDue({ ...config, lastRotated: new Date(now - 10000).toISOString() }, now), false);
  assert.equal(canvasRenewalDue({ ...config, lastAttempt: new Date(now - 10000).toISOString() }, now), false);
  assert.equal(canvasRenewalDue({ ...config, status: 'needs-login' }, now), false);
  assert.equal(canvasRenewalDue({ ...config, enabled: false }, now), false);
  assert.equal(canvasRenewalDue({ ...config, lastRotated: new Date(now).toISOString(), expiresAt: new Date(now + 20 * 60000).toISOString() }, now), true);
});

const browser = vm.createContext({ URL, module: { exports: {} } }); vm.runInContext(CANVAS_ROTATION_SCRIPT, browser);
const rotation = browser.module.exports;
function rotationFixture(options: { scopeChanged?: boolean; candidateNetworkFail?: boolean; permanentExpiry?: boolean; otherAccount?: boolean } = {}) {
  const now = new Date('2026-10-30T12:00:00Z').getTime(), fresh = 'b'.repeat(64), old = 'a'.repeat(64), events: string[] = [];
  const meta = { id: 7, user_id: 42, purpose: 'TJMuse', workflow_state: 'active', scopes: [], expires_at: new Date(now + 10 * 60000).toISOString(), permanent_expires_at: options.permanentExpiry ? new Date(now - 1000).toISOString() : null };
  const response = (data: unknown, status = 200) => ({ ok: status === 200, status, json: async () => data, headers: { get: () => status === 401 ? 'Bearer' : null } });
  const io = { origin: 'https://canvas.tongji.edu.cn', now: () => now, csrf: () => 'csrf', tokenLinks: () => ['/profile/tokens/7'], saveCandidate: async () => { events.push('saved'); }, commitVerified: async () => { events.push('verified'); },
    fetch: async (url: string, init: any) => {
      if (init.method === 'PUT') { events.push('rotate'); return response({ ...meta, visible_token: fresh, scopes: options.scopeChanged ? ['new-scope'] : [] }); }
      if (url.endsWith('/profile/tokens/7')) return response(meta);
      if (init.headers?.Authorization === `Bearer ${fresh}` && options.candidateNetworkFail) return response({}, 503);
      return response({ id: !init.headers?.Authorization && options.otherAccount ? 99 : 42 });
    } };
  return { io, config: { accountId: '42', tokenId: '7', purpose: 'TJMuse', currentToken: old, credentialsOnly: true }, events };
}
test('hidden session saves a rotated token before validating it, and does not return its value', async () => {
  const f = rotationFixture(), result = await rotation.run(f.io, f.config);
  assert.deepEqual(f.events, ['rotate','saved','verified']); assert.equal(result.rotated, true);
  assert.equal(JSON.stringify(result).includes('b'.repeat(64)), false);
});
test('renewal stops on account changes/permanent expiry and quarantines a scope change before activation', async () => {
  for (const opt of [{ otherAccount: true }, { permanentExpiry: true }]) {
    const f = rotationFixture(opt); await assert.rejects(rotation.run(f.io, f.config)); assert.equal(f.events.includes('rotate'), false);
  }
  const f = rotationFixture({ scopeChanged: true }); await assert.rejects(rotation.run(f.io, f.config), { code: 'rotation_identity_or_scope_changed' });
  assert.deepEqual(f.events, ['rotate','saved']);
});
test('a saved candidate survives verification failure and is recovered without a second regeneration', async () => {
  const f = rotationFixture({ candidateNetworkFail: true }); await assert.rejects(rotation.run(f.io, f.config)); assert.deepEqual(f.events, ['rotate','saved']);
  const recovery = rotationFixture(); await rotation.run(recovery.io, { ...recovery.config, currentToken: 'b'.repeat(64), recoverCandidate: true });
  assert.deepEqual(recovery.events, ['verified']);
});
