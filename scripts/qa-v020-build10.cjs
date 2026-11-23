const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'zh-CN', timezoneId: 'Asia/Singapore' });
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-30T08:00:00+08:00') });
    await context.route('https://cdn.jsdelivr.net/**', route => route.abort());
    const button = name => page.getByRole('button', { name, exact: true });
    const sheet = () => page.locator('[data-testid="sheet-card"]:visible');
    const close = async () => { await button('关闭').click(); await sheet().waitFor({ state: 'hidden' }); };
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')));
    const persisted = async (id, value) => page.waitForFunction(({ id, value }) => JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.assignments.find(a => a.id === id)?.completedOverride === value, { id, value });
    await page.goto(process.env.TJMUSE_QA_URL || 'http://127.0.0.1:8081');
    await page.getByLabel('学期第一周内的任意一天', { exact: true }).fill('2026-09-14');
    await button('以这一周作为第 1 周').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).settings.semesterStartDate);
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('tjmuse.data.v1'));
      d.settings.holidayEnabled = false;
      d.tasks = [{ id: 'normal', title: '普通待办', date: '2026-10-30', time: '10:00', duration: 30, description: '', location: '', color: '#123B64', kind: 'todo', repeat: null, subtasks: [{ id: 'sub', title: '普通子任务', completedDates: [] }], completedDates: [] }];
      d.flexibleTasks = [{ id: 'flexible', title: '慢慢完成的小事', description: '测试自由勾选', completed: false }];
      localStorage.setItem('tjmuse.data.v1', JSON.stringify(d));
    });
    await page.reload();
    await button('完成 普通待办').click(); await button('取消完成 普通待办').click(); await button('完成 普通待办').waitFor();
    await button('查看 普通待办').click(); await button('完成子任务 普通子任务').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).tasks[0].subtasks[0].completedDates.length === 1);
    await button('完成子任务 普通子任务').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).tasks[0].subtasks[0].completedDates.length === 0);
    await button('AI').click(); await button('完成自由事项 慢慢完成的小事').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).flexibleTasks[0].completed === true);
    await button('完成自由事项 慢慢完成的小事').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).flexibleTasks[0].completed === false);

    const make = (id, name, submission = { workflow_state: 'unsubmitted' }) => ({
      id, name, created_at: '2026-10-28T08:00:00+08:00', unlock_at: null, due_at: '2026-11-10T18:00:00+08:00',
      description: `仅供测试 ${name}`, html_url: `https://canvas.tongji.edu.cn/courses/1/assignments/${id}`, submission,
    });
    let assignments = [
      make(1, '即将到来未提交', { workflow_state: 'graded', submitted_at: null, score: 0, missing: true }),
      make(2, '已交可反选', { workflow_state: 'submitted', submitted_at: '2026-10-29T10:00:00+08:00' }),
      make(3, '恢复案例'), make(4, '清空案例'), make(5, '自动到期案例'), make(6, '重启到期案例'),
    ];
    await context.route('https://canvas.tongji.edu.cn/api/v1/**', route => {
      const request = route.request(), url = new URL(request.url());
      assert.equal(request.method(), 'GET'); assert.equal(request.headers().authorization, 'Bearer build10-test-token');
      requests.push(url.pathname);
      const body = url.pathname.endsWith('/profile') ? { id: 10 } : url.pathname.endsWith('/courses') ? [{ id: 1, name: '数学' }] : assignments;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    const connect = async () => {
      await button('作业').click(); await page.getByText('Canvas 作业', { exact: true }).waitFor();
      const settings = button('Canvas 连接设置'); await (await settings.count() ? settings : button('连接 Canvas')).click();
      await page.getByLabel('个人访问令牌', { exact: true }).fill('build10-test-token');
      await button('验证令牌并同步').click(); await sheet().waitFor({ state: 'hidden' });
    };
    const sync = async () => {
      const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/assignments'));
      await button('同步 Canvas 作业').click(); await response; await page.waitForTimeout(150);
    };
    const remove = async title => {
      await button('作业').click(); await button(`查看作业 ${title}`).click(); await button('删除作业').click(); await sheet().waitFor({ state: 'hidden' });
      await button(`查看作业 ${title}`).waitFor({ state: 'hidden' });
    };
    await connect();
    await button('完成作业 即将到来未提交').waitFor();
    await button('取消完成作业 已交可反选').click(); await persisted('1:2', false);
    await button('完成作业 已交可反选').waitFor();
    await button('完成作业 即将到来未提交').click(); await persisted('1:1', true);
    await sync(); await button('完成作业 已交可反选').waitFor(); await button('取消完成作业 即将到来未提交').waitFor();
    await button('To-do').click(); await button('完成 已交可反选').click(); await persisted('1:2', true);
    await button('取消完成 已交可反选').click(); await persisted('1:2', false);
    await page.reload(); await button('完成 已交可反选').waitFor(); await button('取消完成 即将到来未提交').waitFor();
    await connect(); await button('完成作业 已交可反选').waitFor(); await button('取消完成作业 即将到来未提交').waitFor();

    await remove('恢复案例');
    const deleteTime = (await stored()).canvas.preferences['1:3'].deletedAt; assert.ok(deleteTime);
    const recoveryFixture = assignments.find(a => a.id === 3); assignments = assignments.filter(a => a.id !== 3);
    await sync(); assert.equal((await stored()).canvas.assignments.find(a => a.id === '1:3').title, '恢复案例');
    assert.equal((await stored()).canvas.preferences['1:3'].deletedAt, deleteTime);
    await page.reload(); await button('作业').click(); await button('查看已删除作业（1）').click();
    await page.getByText('已经删除的作业', { exact: true }).waitFor(); await button('恢复作业 恢复案例').click();
    await page.getByText('暂无已删除的作业。', { exact: true }).waitFor(); await close();
    await button('查看作业 恢复案例').waitFor(); assert.equal((await stored()).canvas.preferences['1:3'].deletedAt, undefined);
    assignments.push(recoveryFixture); await connect();

    await remove('清空案例'); await button('查看已删除作业（1）').click();
    assert.equal(await page.getByLabel('启用手动清空', { exact: true }).isChecked(), false);
    await page.getByLabel('启用手动清空', { exact: true }).click(); await button('清空已删除作业').click();
    assert.equal(await sheet().count(), 1); await button('保留作业').click(); await button('恢复作业 清空案例').waitFor();
    await button('清空已删除作业').click(); await button('确认清空').click();
    await page.getByText('暂无已删除的作业。', { exact: true }).waitFor(); await close();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.preferences['1:4'].purged);
    assert.equal(JSON.stringify((await stored()).canvas).includes('清空案例'), false);
    await sync(); assert.equal(await button('查看作业 清空案例').count(), 0);

    await remove('自动到期案例');
    const expiry = Date.parse((await stored()).canvas.preferences['1:5'].deletedAt) + 72 * 3600000;
    await button('查看已删除作业（1）').click(); await page.waitForTimeout(200);
    await page.screenshot({ path: 'artifacts/homework-trash-020-build10.png' }); await close();
    const current = await page.evaluate(() => Date.now()); await page.clock.fastForward(expiry - current - 1000);
    assert.equal((await stored()).canvas.assignments.some(a => a.id === '1:5'), true);
    await page.clock.fastForward(1100);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.preferences['1:5'].purged);
    assert.equal((await stored()).canvas.assignments.some(a => a.id === '1:5'), false);
    await button('查看已删除作业（0）').click(); await page.getByText('暂无已删除的作业。', { exact: true }).waitFor(); await close();
    await sync(); assert.equal(await button('查看作业 自动到期案例').count(), 0);

    await remove('重启到期案例');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.preferences['1:6'].deleted);
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('tjmuse.data.v1'));
      d.canvas.preferences['1:6'].deletedAt = new Date(Date.now() - 73 * 3600000).toISOString();
      localStorage.setItem('tjmuse.data.v1', JSON.stringify(d));
    });
    await page.reload(); await button('作业').click(); await button('查看已删除作业（0）').waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.preferences['1:6'].purged);
    assert.equal((await stored()).canvas.assignments.some(a => a.id === '1:6'), false);
    await connect(); assert.equal(await button('查看作业 重启到期案例').count(), 0);
    assert.equal(await button('查看作业 清空案例').count(), 0); assert.equal(await button('查看作业 自动到期案例').count(), 0);
    await button('完成作业 已交可反选').waitFor();
    assert.equal(JSON.stringify(await stored()).includes('build10-test-token'), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'passed', upcomingUnchecked: true, allCheckboxesReversible: true,
      submittedOverrideSurvivesSyncAndReload: true, deletedSnapshotSurvivesSync: true, recovery: true,
      guardedManualClear: true, clearSurvivesSync: true, expiryAt72Hours: true, expiryOnRestart: true,
      expiredItemsStayRemoved: true, onlyReadRequests: true, requestCount: requests.length, pageErrors: errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
