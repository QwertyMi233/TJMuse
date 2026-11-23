const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
  const p=await b.newPage({viewport:{width:393,height:852},locale:'zh-CN'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.clock.install({time:new Date('2026-11-05T15:00:00+08:00')});await p.goto('http://127.0.0.1:8081/?demo=021');
  const button=name=>p.getByRole('button',{name,exact:true});const close=async()=>{await button('关闭').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});};
  await button('课程表').click();await p.getByTestId('schedule-grid').waitFor();await p.getByRole('button',{name:/^课程 线性代数 A/}).first().waitFor();
  await p.screenshot({path:'artifacts/preview-021-build16-schedule.png'});
  await p.getByRole('button',{name:/^课程 线性代数 A/}).first().click();await p.getByText('地点：北301',{exact:true}).waitFor();await close();
  const before=await p.getByRole('button',{name:/^课程 /}).count();await button('课表下一周').click();assert.notEqual(await p.getByRole('button',{name:/^课程 /}).count(),before);await button('课表回到本周').click();
  await button('添加或管理课表').click();await button('显示课表 同济秋季示例课表').click();await close();assert.equal(await p.getByRole('button',{name:/^课程 /}).count(),0);
  await button('添加或管理课表').click();await button('显示课表 同济秋季示例课表').click();await close();assert.ok(await p.getByRole('button',{name:/^课程 /}).count()>0);
  await button('To-do').click();await p.getByTestId('date-number-2026-10-31').first().waitFor({state:'attached'});const hollow=p.getByTestId('date-number-2026-10-31').first().locator('svg text');assert.equal(await hollow.getAttribute('fill'),'none');
  const filled=p.getByTestId('date-number-2026-11-05').first().locator('svg text');assert.notEqual(await filled.getAttribute('fill'),'none');await p.screenshot({path:'artifacts/preview-021-build16-dates.png'});
  // Ordinary data edits must not start another automatic sync. A background return must.
  await p.clock.runFor(2500);await p.waitForTimeout(200);const last=await p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).canvas.lastSync);await p.clock.runFor(10000);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).canvas.lastSync),last);
  await p.evaluate(()=>{for(const key of ['visibilityState','webkitVisibilityState'])Object.defineProperty(document,key,{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('webkitvisibilitychange'));});
  await p.evaluate(()=>{for(const key of ['visibilityState','webkitVisibilityState'])Object.defineProperty(document,key,{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('webkitvisibilitychange'));});
  for(let i=0;i<5;i++){await p.clock.runFor(1000);await p.waitForTimeout(30);}
  assert.notEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).canvas.lastSync),last);
  await button('课程表').click();for(const width of [320,393,768]){await p.setViewportSize({width,height:852});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  assert.deepEqual(errors,[]);const result={passed:true,timetableWeekSwitch:true,courseDetails:true,multipleTableVisibility:true,hollowEmptyDates:true,noSyncLoop:true,foregroundSync:true,responsiveWidths:[320,393,768],pageErrors:errors};fs.writeFileSync('.build-tools/qa-build16-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
