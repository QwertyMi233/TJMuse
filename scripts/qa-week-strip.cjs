const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'zh-CN', timezoneId: 'Asia/Singapore' });
    await context.route('https://cdn.jsdelivr.net/**', route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-12-31T08:00:00+08:00') });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8081');
    const button = name => page.getByRole('button', { name, exact: true });
    await page.getByLabel('学期第一周内的任意一天', { exact: true }).fill('2026-09-14');
    await button('以这一周作为第 1 周').click();
    await page.getByText('第 16 周', { exact: true }).waitFor();
    const swipe = async (direction, distance = .55) => {
      const box = await page.getByTestId('week-strip').boundingBox();
      const x = box.x + box.width * (direction > 0 ? .8 : .2), y = box.y + box.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x - direction * box.width * distance, y, { steps: 16 });
      // Avoid misclassifying a short, slow drag as a high velocity flick.
      if (distance < .1) await page.waitForTimeout(220);
      await page.mouse.up();
    };
    // Repeated swipes start as soon as the previous selection commits.
    for (let week = 17; week <= 24; week++) { await swipe(1); await page.getByText(`第 ${week} 周`, { exact: true }).waitFor(); }
    for (let week = 23; week >= 16; week--) { await swipe(-1); await page.getByText(`第 ${week} 周`, { exact: true }).waitFor(); }
    await swipe(1, .035); await page.waitForTimeout(400);
    await page.getByText('第 16 周', { exact: true }).waitFor();
    await button('下一周').click(); await page.getByText('第 17 周', { exact: true }).waitFor();
    await button('上一周').click(); await page.getByText('第 16 周', { exact: true }).waitFor();
    await button('2027-01-01').click(); await page.getByText('JANUARY', { exact: true }).waitFor();
    await button('跳转到今天').click(); await page.getByText('DECEMBER', { exact: true }).waitFor();
    await button('选择日程日期').click(); await page.getByLabel('选择日期', { exact: true }).fill('2030-01-01');
    await button('查看日程').click(); await page.getByText('JANUARY', { exact: true }).waitFor();
    await button('下一周').click(); await button('2030-01-08').waitFor();
    await button('跳转到今天').click(); await page.getByText('第 16 周', { exact: true }).waitFor();
    for (const width of [320, 768, 393]) {
      await page.setViewportSize({ width, height: 852 }); await page.waitForTimeout(100);
      await swipe(1); await page.getByText('第 17 周', { exact: true }).waitFor();
      await swipe(-1); await page.getByText('第 16 周', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'passed', repeatedSwipes: 22, yearBoundary: true, dateSelection: true,
      arrows: true, distantDateJump: true, partialDrag: true, responsiveWidths: [320, 393, 768], pageErrors: errors,
      scope: 'Web gesture regression; native paging smoothness requires iOS/Android device verification.' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
