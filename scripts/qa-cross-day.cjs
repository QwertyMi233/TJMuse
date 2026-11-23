const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, locale: 'zh-CN', timezoneId: 'Asia/Singapore' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-28T00:15:00+08:00') });
    await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
    await page.goto('http://127.0.0.1:8081');
    await page.getByLabel('学期第一周内的任意一天', { exact: true }).fill('2026-09-14');
    await page.getByRole('button', { name: '以这一周作为第 1 周', exact: true }).click();
    const button = name => page.getByRole('button', { name, exact: true });
    const jump = async date => {
      await button('选择日程日期').click();
      await page.getByLabel('选择日期', { exact: true }).fill(date);
      await button('查看日程').click();
    };
    // End time is directly editable; the duration input remains available and linked.
    await button('添加 To-do').click();
    await page.getByRole('textbox', { name: 'TO-DO 名称', exact: true }).fill('结束时间验证');
    await page.getByLabel('结束时间', { exact: true }).fill('10:15');
    assert.equal(await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).inputValue(), '75');
    await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).fill('90');
    assert.equal(await page.getByLabel('结束时间', { exact: true }).inputValue(), '10:30');
    await page.getByLabel('结束时间', { exact: true }).fill('11:00');
    assert.equal(await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).inputValue(), '120');
    for (const width of [320, 393, 768]) {
      await page.setViewportSize({ width, height: 852 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `task editor overflow at ${width}`);
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await page.getByLabel('开始日期', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/task-time-editor.png' });
    await button('确认添加').click();
    await button('编辑 结束时间验证').click();
    assert.equal(await page.getByLabel('结束时间', { exact: true }).inputValue(), '11:00');
    assert.equal(await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).inputValue(), '120');
    await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).fill('45');
    assert.equal(await page.getByLabel('结束时间', { exact: true }).inputValue(), '09:45');
    await button('保存更改').click();
    await button('编辑 结束时间验证').click();
    assert.equal(await page.getByLabel('结束时间', { exact: true }).inputValue(), '09:45');
    await button('删除 To-do').click();
    await button('确认').click();
    // Add yesterday's task while today's list is open. It must appear immediately.
    await button('添加 To-do').click();
    await page.getByRole('textbox', { name: 'TO-DO 名称', exact: true }).fill('跨天复习');
    await page.getByLabel('开始日期', { exact: true }).fill('2026-10-27');
    await page.getByLabel('开始时间', { exact: true }).fill('23:30');
    assert.equal(await page.getByLabel('结束日期', { exact: true }).inputValue(), '2026-10-28');
    await page.getByLabel('结束日期', { exact: true }).fill('2026-10-27');
    await page.getByLabel('结束时间', { exact: true }).fill('23:00');
    await button('确认添加').click();
    await page.getByText('结束日期和时间需要晚于开始日期和时间。', { exact: true }).waitFor();
    await page.getByLabel('结束日期', { exact: true }).fill('2026-10-28');
    await page.getByLabel('结束时间', { exact: true }).fill('01:00');
    assert.equal(await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).inputValue(), '90');
    await button('添加子任务').click();
    await page.getByRole('textbox', { name: '填入子任务 1…', exact: true }).fill('整理资料');
    await button('确认添加').click();
    await button('编辑 跨天复习').waitFor();
    await page.getByText('跨天续程 · 2026-10-27 23:30 → 2026-10-28 01:00', { exact: true }).waitFor();
    await button('查看 跨天复习').click();
    await button('完成子任务 整理资料').click();
    await button('完成 跨天复习').click();
    await jump('2026-10-27');
    await button('取消完成 跨天复习').waitFor();
    await page.getByText(/子任务 1\/1/).waitFor();
    await button('取消完成 跨天复习').click();
    await jump('2026-10-28');
    await button('完成 跨天复习').waitFor();
    // Lengthen from a continuation, preserving the original start and shared subtasks.
    await button('编辑 跨天复习').click();
    assert.equal(await page.getByLabel('开始日期', { exact: true }).inputValue(), '2026-10-27');
    await page.getByRole('textbox', { name: '时长 / 分钟', exact: true }).fill('1530');
    assert.equal(await page.getByLabel('结束日期', { exact: true }).inputValue(), '2026-10-29');
    assert.equal(await page.getByLabel('结束时间', { exact: true }).inputValue(), '01:00');
    await button('保存更改').click();
    await jump('2026-10-29');
    await button('编辑 跨天复习').waitFor();
    await jump('2026-10-30');
    assert.equal(await button('编辑 跨天复习').count(), 0);
    await jump('2026-10-28');
    // Daily starts have independent occurrence keys, even when their spans overlap.
    await button('添加 To-do').click();
    await button('展开任务类型').click();
    await button('循环').click();
    await button('天').click();
    await page.getByRole('textbox', { name: 'TO-DO 名称', exact: true }).fill('循环夜读');
    await page.getByLabel('开始日期', { exact: true }).fill('2026-10-27');
    await page.getByLabel('开始时间', { exact: true }).fill('23:30');
    await page.getByLabel('结束日期', { exact: true }).fill('2026-10-28');
    await page.getByLabel('结束时间', { exact: true }).fill('01:00');
    await button('确认添加').click();
    await button('完成 循环夜读（2026-10-27 开始）').click();
    await button('完成 循环夜读（2026-10-28 开始）').waitFor();
    await jump('2026-10-27');
    await button('取消完成 循环夜读（2026-10-27 开始）').waitFor();
    await jump('2026-10-28');
    await page.reload();
    await button('取消完成 循环夜读（2026-10-27 开始）').waitFor();
    await button('完成 循环夜读（2026-10-28 开始）').waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).tasks.length === 2);
    for (const width of [320, 393, 768]) {
      await page.setViewportSize({ width, height: 852 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `cross-day overflow at ${width}`);
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await page.screenshot({ path: 'artifacts/cross-day.png' });
    // Deleting from the middle day removes the one underlying record everywhere.
    await button('编辑 跨天复习').click();
    await button('删除 To-do').click();
    await button('确认').click();
    for (const date of ['2026-10-27', '2026-10-28', '2026-10-29']) {
      await jump(date);
      assert.equal(await button('编辑 跨天复习').count(), 0);
    }
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).tasks.length === 1);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'passed', endTimeSelection: true, durationInputRetained: true, bidirectionalTimeCalculation: true, sharedCompletion: true, sharedSubtasks: true, multiDayEditing: true, recurringOccurrencesIndependent: true, pageErrors: errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
