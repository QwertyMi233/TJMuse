import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasOrigin, canvasToken, canvasSettingsUrl, fetchCanvasSnapshot } from '../src/core/canvas-api';
import { restoreData } from '../src/core/storage';
import { initialData } from '../src/core/defaults';

const base = 'https://canvas.tongji.edu.cn';
const json = (value: unknown, headers?: Record<string, string>) => new Response(JSON.stringify(value), { headers });
const profile = { id: 10, name: 'not persisted' };
test('Canvas accepts a HTTPS root and a pasted token, rejects unsafe connection input', () => {
  assert.equal(canvasOrigin(''), base); assert.equal(canvasOrigin('canvas.tongji.edu.cn/'), base);
  assert.equal(canvasSettingsUrl(base), base + '/profile/settings');
  assert.equal(canvasToken(' Bearer 123~test '), '123~test');
  for (const url of ['http://canvas.tongji.edu.cn','https://u:p@canvas.tongji.edu.cn','https://canvas.tongji.edu.cn/profile/settings','https://canvas.tongji.edu.cn/?token=x']) assert.throws(() => canvasOrigin(url));
  for (const token of ['', 'a\nb', 'a b', '令牌', 'x'.repeat(4097)]) assert.throws(() => canvasToken(token));
});
test('personal token fetches profile, course and assignment pages using GET and Authorization only', async () => {
  const requests: string[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(url);
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer 123~test');
    assert.ok(!url.includes('123~test'));
    if (url.endsWith('/profile')) return json(profile);
    if (url.includes('/courses?') && !url.includes('page=2')) return json([{ id: 1, name: '数学' }], { Link: `<${base}/api/v1/courses?page=2>; rel="next"` });
    if (url.includes('/courses?page=2')) return json([{ id: 2, name: '物理' }]);
    if (url.includes('/courses/2/')) return json([{ id: 8, name: '未发布', published: false }]);
    if (url.includes('page=2')) return json([{ id: 3, name: '无期限', due_at: null }, { id: 2, name: '更新后的标题', unlock_at:'2026-10-20T08:00:00+08:00',created_at:'2026-10-19T08:00:00+08:00', due_at: '2026-10-29T23:59:00+08:00', description: '<script>bad()</script><p>完成 &amp; 检查</p>', submission: { workflow_state: 'submitted' } }]);
    return json([{ id: 2, name: '第一页', due_at: null }], { Link: `<${base}/api/v1/courses/1/assignments?page=2>; rel="next"` });
  };
  const result = await fetchCanvasSnapshot(base, '123~test', undefined, transport);
  assert.equal(result.userId, '10'); assert.equal(result.assignments.length, 2); assert.equal(requests.length, 6);
  assert.equal(result.assignments[0]!.title, '更新后的标题'); assert.equal(result.assignments[0]!.description, '完成 & 检查');
  assert.equal(result.assignments[0]!.dueAt, '2026-10-29T15:59:00.000Z'); assert.equal(result.assignments[0]!.submitted, true);
  assert.equal(result.assignments[1]!.dueAt, null); assert.equal(result.assignments[1]!.submitted, null);
  assert.equal(result.assignments[0]!.unlockAt,'2026-10-20T00:00:00.000Z');assert.equal(result.assignments[0]!.createdAt,'2026-10-19T00:00:00.000Z');assert.ok(result.assignments[0]!.firstSeenAt);
  assert.ok(!JSON.stringify(result).includes('123~test')); assert.ok(!JSON.stringify(result).includes('not persisted'));
});
test('invalid, restricted, throttled and non-JSON Canvas responses give actionable errors', async () => {
  for (const [status, expected] of [[401,/令牌无效/],[403,/权限/],[429,/过于频繁/],[500,/已有作业已保留/]] as const) {
    await assert.rejects(fetchCanvasSnapshot(base, 'test', undefined, async () => new Response('failed', { status })), expected);
  }
  await assert.rejects(fetchCanvasSnapshot(base, 'test', undefined, async () => new Response('<html>login</html>')), /未返回作业数据/);
});
test('pagination never forwards a personal token to another origin and rejects repeated pages', async () => {
  for (const target of ['https://other.example/api/v1/courses?page=2',base+'/api/v1/courses?access_token=bad',base+'/profile/settings']) {
    let calls = 0;
    await assert.rejects(fetchCanvasSnapshot(base, 'test', undefined, async url => {
      calls++; if (String(url).endsWith('/profile')) return json(profile);
      return json([], { Link: `<${target}>; rel="next"` });
    }), /分页地址/);
    assert.equal(calls, 2);
  }
  let count = 0;
  await assert.rejects(fetchCanvasSnapshot(base, 'test', undefined, async url => {
    count++; if (String(url).endsWith('/profile')) return json(profile);
    return json([], { Link: `<${String(url)}>; rel="next"` });
  }), /重复/);
  assert.equal(count, 2);
});
test('partial course failure, invalid data and cancellation never produce a partial snapshot', async () => {
  await assert.rejects(fetchCanvasSnapshot(base, 'test', undefined, async url => {
    if (String(url).endsWith('/profile')) return json(profile);
    if (String(url).includes('/courses?')) return json([{id:1},{id:2}]);
    if (String(url).includes('/courses/1/')) return json([{id:2,name:'已读取'}]);
    return new Response('',{status:503});
  }), /已有作业已保留/);
  await assert.rejects(fetchCanvasSnapshot(base, 'test', undefined, async () => json({id:'bad'})), /验证/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchCanvasSnapshot(base, 'test', controller.signal, async (_url,init) => { init?.signal?.throwIfAborted(); return json(profile); }), /取消/);
});
test('old OAuth cache survives migration while the obsolete connection and secret fields are removed', () => {
  const original=structuredClone(initialData);
  const migrated=restoreData({...original,canvas:{gatewayUrl:'https://old.example',connected:true,lastSync:'2026-10-29T00:00:00Z',assignments:[{id:'1:2',completed:true}],accessToken:'must-not-be-restored'}});
  assert.equal(migrated.canvas.baseUrl,base); assert.equal(migrated.canvas.connected,false);
  assert.equal(migrated.canvas.assignments[0]!.completed,true); assert.ok(!JSON.stringify(migrated).includes('must-not-be-restored'));
  const connected=structuredClone(initialData); connected.canvas.connected=true; connected.canvas.userId='10';
  assert.equal(restoreData(connected).canvas.connected,true);
});
