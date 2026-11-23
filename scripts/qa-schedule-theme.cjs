const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('tsx/cjs');
const { timetableCaptureScript } = require('../src/services/timetable-capture-script.ts');
const { parseTimetableCapture } = require('../src/core/timetable.ts');

async function checkSyntheticDom(browser) {
    // Run the actual injected extraction/hover code against a synthetic official-site DOM.
    const domContext=await browser.newContext({viewport:{width:1100,height:700}}),dom=await domContext.newPage();
    await domContext.route('https://1.tongji.edu.cn/GraduateStudentTimeTable',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><style>body{margin:0;position:relative;width:1000px;height:700px}.cell{position:absolute;left:100px;top:90px;width:100px;height:120px;background:#b8cce8}.title{position:absolute;left:0;top:10px}#end{position:absolute;left:0;top:450px}</style><span class="title">学生课表</span>${['一','二','三','四','五','六','日'].map((d,i)=>`<span style="position:absolute;top:55px;left:${100+i*100}px;width:100px;text-align:center">周${d}</span>`).join('')}<span style="position:absolute;left:0;top:90px;height:60px;width:80px">第1节课</span><span style="position:absolute;left:0;top:150px;height:60px;width:80px">第2节课</span><div class="cell">示甲乙(10001) 示例数学(1)(DEMO101) [1,3,5-9单] 教学楼101</div><span id="end">已选课程列表</span><div style="position:absolute;top:500px;left:100px;background:#b8cce8">不应导入的课程 [1-16]</div><div id="popup" style="position:absolute;top:250px;left:100px;display:none;white-space:pre-line"></div><script>window.messages=[];window.ReactNativeWebView={postMessage:x=>window.messages.push(JSON.parse(x))};document.querySelector('.cell').addEventListener('mouseover',()=>{const p=document.querySelector('#popup');p.style.display='block';p.innerText='[星期一] 排课信息\\n1.[1-2节] [1,3,5-9单] 示例数学(1)(DEMO101) 示甲乙(10001) 教学楼101';});</script>`}));
    await dom.goto('https://1.tongji.edu.cn/GraduateStudentTimeTable');
    await dom.evaluate(timetableCaptureScript('dom-test'));
    await dom.waitForFunction(()=>window.messages.length>0);
    const payload=await dom.evaluate(()=>window.messages[0]);
    assert.ok(payload.capture,JSON.stringify(payload)); assert.equal(payload.nonce,'dom-test'); assert.equal(payload.capture.rows.length,1); assert.equal(payload.capture.popups.length,1);
    const parsed=parseTimetableCapture(payload.capture); assert.equal(parsed.sessions[0].title,'示例数学(1)'); assert.equal(parsed.sessions[0].endPeriod,2); assert.deepEqual(parsed.sessions[0].weeks,[1,3,5,7,9]);
    await domContext.close();
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    if(process.env.QA_DOM_ONLY) { await checkSyntheticDom(browser); console.log('Synthetic official DOM passed'); return; }
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, colorScheme: 'light', locale: 'zh-CN', timezoneId: 'Asia/Singapore' });
    const page = await context.newPage(), errors = []; let schoolRequests = 0;
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-30T08:00:00+08:00') });
    await context.route('https://cdn.jsdelivr.net/**', route => route.abort());
    await context.route(/https:\/\/(canvas\.tongji\.edu\.cn|tongji\.aihaoke\.net|1\.tongji\.edu\.cn)\//, route => { schoolRequests++; return route.abort(); });
    await context.addInitScript(() => localStorage.setItem('tjmuse.data.v1', JSON.stringify({ untouched: true })));
    const button = name => page.getByRole('button', { name, exact: true });
    const close = async () => { await button('关闭').click(); await page.getByTestId('sheet-card').waitFor({ state: 'hidden' }); };
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')));
    const waitSaved = async predicate => { for (let i=0;i<50;i++) { const data=await saved(); if(data&&predicate(data)) return data; await page.waitForTimeout(100); } throw new Error('Saved state did not settle'); };
    await page.goto('http://127.0.0.1:8081/?demo=021');
    await button('课程表').click();
    await page.getByTestId('schedule-placeholder').waitFor();
    assert.equal((await page.getByTestId('schedule-placeholder').innerText()).trim().length, 1); // plus icon only
    await page.screenshot({ path: 'artifacts/preview-021-course-blank.png' });
    const importTable = async name => {
      await button('添加或管理课表').click(); await button('从同济1系统导入').click();
      await page.getByRole('textbox', {name:'课表名称',exact:true}).fill(name);
      await button('核对节次时间').click();
      await page.getByRole('textbox', {name:'第1节开始',exact:true}).waitFor();
      await button('收起节次时间').click();
      await page.screenshot({ path: 'artifacts/preview-021-course-import.png' });
      await button('保存这份课表').click(); await button(`显示课表 ${name}`).waitFor();
      await close();
    };
    await importTable('秋季主课表'); await importTable('选修课表');
    let data = await waitSaved(d=>d.timetables.length===2);
    assert.equal(data.timetables[0].semesterStartDate, data.settings.semesterStartDate);
    await button('To-do').click(); assert.equal(await button('查看 线性代数').count(),2);
    assert.equal(await button('完成 线性代数').count(),0);
    await button('编辑 线性代数').first().click(); await page.getByTestId('sheet-card').getByText('教师：示例教师',{exact:true}).waitFor(); await close();
    await button('课程表').click(); await button('添加或管理课表').click();
    await button('显示课表 选修课表').click(); await close();
    await button('To-do').click(); assert.equal(await button('查看 线性代数').count(),1);
    await page.reload(); await button('查看 线性代数').waitFor();
    data=await saved(); assert.equal(data.timetables[1].enabled,false);
    await button('作业').click(); assert.equal(await page.getByText('作业在 To-do 中的位置',{exact:true}).count(),0);
    await button('我的').click(); await button('首页排版').click(); await button('按分类显示').click(); await close();
    await button('To-do').click();
    await page.getByTestId('category-course').waitFor();
    await button('完成 整理本周学习笔记').click();
    assert.equal(await button('查看 整理本周学习笔记').count(),0);
    await button('展开已完成To-do（1）').click(); await button('查看 整理本周学习笔记').waitFor();
    await button('完成 完成第三章习题').click();
    assert.equal(await button('查看 完成第三章习题').count(),0);
    await button('展开已完成作业（1）').click(); await button('查看 完成第三章习题').waitFor();
    await button('折叠课程分类').click(); assert.equal(await button('查看 线性代数').count(),0);
    await page.reload(); await button('展开课程分类').waitFor();
    await button('查看 整理本周学习笔记').waitFor(); await button('查看 完成第三章习题').waitFor();
    await button('展开课程分类').click();
    await page.screenshot({ path: 'artifacts/preview-021-course-grouped-light.png' });
    await button('我的').click(); await button('主题颜色').click();
    await button('跟随系统').click(); await button('应用主题').click();
    await page.emulateMedia({colorScheme:'dark'});
    await page.waitForFunction(()=>document.documentElement.style.colorScheme==='dark');
    await button('To-do').click();
    const glow=await button('添加 To-do').evaluate(el=>getComputedStyle(el).boxShadow);
    assert.ok(glow.includes('24px') && glow.includes('0, 102, 179'));
    await page.screenshot({ path: 'artifacts/preview-021-course-grouped-dark.png' });
    await button('我的').click(); await button('主题颜色').click();
    await button('浅色模式').click(); await button('应用主题').click();
    await page.waitForFunction(()=>document.documentElement.style.colorScheme==='light');
    await page.emulateMedia({colorScheme:'light'}); await page.emulateMedia({colorScheme:'dark'});
    assert.equal(await page.evaluate(()=>document.documentElement.style.colorScheme),'light');
    await button('主题颜色').click(); await button('编辑深色配色').click();
    assert.equal(await page.getByRole('textbox',{name:'背景色',exact:true}).inputValue(),'#111D2D');
    await page.getByRole('textbox',{name:'背景色',exact:true}).fill('#152438');
    await button('编辑浅色配色').click(); assert.equal(await page.getByRole('textbox',{name:'背景色',exact:true}).inputValue(),'#FFFFFF');
    await button('跟随系统').click(); await button('应用主题').click();
    await page.waitForFunction(()=>document.documentElement.style.colorScheme==='dark');
    data=await waitSaved(d=>d.settings.themePalettes.dark.background==='#152438');
    assert.equal(data.settings.themePalettes.light.background,'#FFFFFF');
    await button('主题颜色').click(); await button('恢复同济蓝配色').click();
    await button('应用主题').click(); await button('关于我们').click();
    const credit=page.getByText('Contributor qp338113',{exact:true}); await credit.waitFor();
    assert.equal(await credit.evaluate(el=>Boolean(el.closest('a,[role="button"]'))),false);
    assert.equal(await credit.evaluate(el=>getComputedStyle(el).textAlign),'center');
    await page.waitForTimeout(500); await page.screenshot({ path: 'artifacts/preview-021-course-about.png' }); await close();
    await button('课程表').click(); await button('添加或管理课表').click();
    await button('删除课表 选修课表').click(); await button('确认删除课表').click();
    data=await waitSaved(d=>d.timetables.length===1); assert.equal(data.timetables[0].name,'秋季主课表'); await close();
    await button('我的').click(); await button('首页排版').click(); await button('按时间穿插').click(); await close();
    await button('To-do').click(); assert.equal(await page.getByTestId('category-course').count(),0);
    await page.emulateMedia({colorScheme:'light'});
    await page.screenshot({ path: 'artifacts/preview-021-course-timeline.png' });
    for(const width of [320,393,768]) { await page.setViewportSize({width,height:852}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); }
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.data.v1'))),{untouched:true});
    assert.equal(schoolRequests,0); assert.deepEqual(errors,[]);

    await checkSyntheticDom(browser);
    const result={result:'passed',multipleTables:true,visibilityAndPersistence:true,blankCoursePage:true,courseDetail:true,independentCategoryFolds:true,completedTaskFolds:true,unifiedLayoutSettings:true,systemAndManualThemes:true,independentPalettes:true,darkGlow:true,plainContributor:true,syntheticOfficialDom:true,schoolRequests,pageErrors:errors};
    fs.writeFileSync('.build-tools/qa-schedule-theme-result.json',JSON.stringify(result)); console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
