import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionUrl, plannerContext, requestAI } from '../src/services/ai';
import { initialData } from '../src/core/defaults';
import { builtIn2026 } from '../src/services/holidays';
test('API URL normalization retains gateway paths and avoids duplicate endpoints', () => {
  assert.equal(completionUrl('https://api.example.com/gateway/v1/'), 'https://api.example.com/gateway/v1/chat/completions');
  assert.equal(completionUrl('https://api.example.com/v1/chat/completions'), 'https://api.example.com/v1/chat/completions');
  assert.throws(() => completionUrl('http://api.example.com'), /https/);
  assert.throws(() => completionUrl('https://key@api.example.com'), /账号/);
});
test('planner includes fixed tasks, course availability, flexible backlog, completion and holiday context', () => {
  const data = structuredClone(initialData);
  data.flexibleTasks = [{ id: 'a', title: '读书', description: '十五分钟', completed: false }, { id: 'b', title: '已读完的小说', description: '', completed: true }];
  const context = plannerContext(data, new Date(2026, 9, 10, 8, 0), { name: '国庆节', date: '2026-10-10', isOffDay: false });
  assert.match(context, /读书/); assert.doesNotMatch(context, /已读完的小说/); assert.match(context, /调休上班/); assert.match(context, /不要虚构课程/); assert.match(context, /具体到分钟/);
});
test('2026 built-in holiday data differentiates holiday weekends and replacement workdays', () => {
  assert.equal(builtIn2026.days.find(d => d.date === '2026-10-07')?.isOffDay, true);
  assert.equal(builtIn2026.days.find(d => d.date === '2026-10-10')?.isOffDay, false);
  assert.equal(builtIn2026.days.filter(d => !d.isOffDay).length, 6);
});
test('AI sends an authenticated chat request and reports service failures without leaking keys', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), 'https://api.openai.com/v1/chat/completions');
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.stream, false); assert.equal(body.max_completion_tokens, 4096); assert.equal(body.messages[0].role, 'system');
      return new Response(JSON.stringify({ choices: [{ message: { content: '09:00–09:30 复习' }, finish_reason: 'stop' }] }), { status: 200 });
    };
    assert.equal(await requestAI(initialData, 'test-key', [{ role: 'user', content: '规划今天' }]), '09:00–09:30 复习');
    globalThis.fetch = async () => new Response('secret-server-details', { status: 401 });
    await assert.rejects(requestAI(initialData, 'test-key', []), /API Key 无效/);
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 });
    await assert.rejects(requestAI(initialData, 'test-key', []), /未返回文本/);
  } finally { globalThis.fetch = original; }
});
