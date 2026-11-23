const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
 try{
 const context=await browser.newContext({viewport:{width:393,height:852},locale:'zh-CN',timezoneId:'Asia/Singapore'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-29T08:00:00+08:00')});
 await context.route('https://cdn.jsdelivr.net/**',r=>r.abort());
 const button=name=>page.getByRole('button',{name,exact:true}),close=async()=>{await button('关闭').click();await page.locator('[data-testid="sheet-card"]:visible').waitFor({state:'hidden'});};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.data.v1')));
 await page.goto('http://127.0.0.1:8081');await page.getByLabel('学期第一周内的任意一天',{exact:true}).fill('2026-09-14');await button('以这一周作为第 1 周').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tjmuse.data.v1')).settings.semesterStartDate);
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('tjmuse.data.v1'));d.settings.todoNotifications=true;d.settings.courseNotifications=true;d.settings.homeworkNotifications=true;d.tasks=[{id:'normal',title:'普通任务',date:'2026-10-29',time:'10:00',duration:30,description:'',location:'',color:'#123B64',kind:'todo',repeat:null,subtasks:[],completedDates:[]}];localStorage.setItem('tjmuse.data.v1',JSON.stringify(d));});
 await page.reload();await button('查看 普通任务').waitFor();
 const assignment=(id,name,due)=>({id,name,created_at:'2026-10-28T08:00:00+08:00',unlock_at:null,due_at:due,description:'测试作业说明',html_url:`https://canvas.tongji.edu.cn/courses/1/assignments/${id}`,submission:{workflow_state:'unsubmitted'}});
 const assignments=[assignment(1,'限时作业','2026-10-30T18:00:00+08:00'),assignment(2,'自由作业',null),assignment(3,'默认自由作业',null)];let batches=0;
 await context.route('https://canvas.tongji.edu.cn/api/v1/**',route=>{
  const url=new URL(route.request().url());assert.equal(route.request().method(),'GET');assert.equal(route.request().headers().authorization,'Bearer v020-test-token');
  let body;if(url.pathname.endsWith('/profile')){batches++;body={id:10};}else if(url.pathname.endsWith('/courses'))body=[{id:1,name:'数学'}];else body=assignments;
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 const connect=async()=>{await button('作业').click();await page.getByText('Canvas 作业',{exact:true}).waitFor();const settings=button('Canvas 连接设置');await (await settings.count()?settings:button('连接 Canvas')).click();await page.getByLabel('个人访问令牌',{exact:true}).fill('v020-test-token');await button('验证令牌并同步').click();await button('验证令牌并同步').waitFor({state:'hidden'});};
 const sync=async()=>{const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/assignments'));await button('同步 Canvas 作业').click();await response;await page.waitForTimeout(100);};
 const choose=async(name,choice)=>{await button('作业').click();await button(`查看作业 ${name}`).click();await button(choice).click();await close();};
 await connect();assert.equal(batches,1);await button('To-do').click();await button('查看 限时作业').waitFor();assert.equal(await button('查看 自由作业').count(),0);
 await button('我的').click();await button('作业').click();await page.clock.fastForward(11*60000);await page.waitForTimeout(100);assert.equal(batches,1);
 await choose('限时作业','隐藏');await button('To-do').click();await button('查看 普通任务').waitFor();assert.equal(await button('查看 限时作业').count(),0);
 await choose('自由作业','显示');await button('To-do').click();await button('查看 自由作业').waitFor();await page.getByText('无截止时间 · Canvas 作业',{exact:true}).waitFor();
 await button('作业').click();await sync();await button('To-do').click();await button('查看 自由作业').waitFor();assert.equal(await button('查看 限时作业').count(),0);
 await button('作业').click();await button('查看作业 自由作业').click();await button('删除作业').click();await button('查看作业 自由作业').waitFor({state:'hidden'});await sync();assert.equal(await button('查看作业 自由作业').count(),0);
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.preferences['1:2'].deleted);await page.reload();await button('作业').click();await button('查看已删除作业（1）').click();await button('恢复作业 自由作业').click();await close();await button('查看作业 自由作业').waitFor();
 await connect();await button('To-do').click();await button('查看 自由作业').waitFor();assert.equal(await button('查看 限时作业').count(),0);
 const displaySettings=async()=>{await button('我的').click();await button('作业显示设置').click();};
 await displaySettings();assert.equal(await page.getByLabel('隐藏无时间限制的作业',{exact:true}).isChecked(),true);await page.getByLabel('在 To-do 显示作业',{exact:true}).click();await close();await button('To-do').click();await button('查看 普通任务').waitFor();assert.equal(await button('查看 自由作业').count(),0);
 await displaySettings();await page.getByLabel('在 To-do 显示作业',{exact:true}).click();await page.getByLabel('隐藏无时间限制的作业',{exact:true}).click();await page.getByLabel('有截止时间的作业默认显示',{exact:true}).click();await close();
 await choose('限时作业','跟随默认');await button('To-do').click();await button('查看 默认自由作业').waitFor();assert.equal(await button('查看 限时作业').count(),0);
 await choose('限时作业','显示');await button('To-do').click();await button('查看 限时作业').waitFor();
 await button('我的').click();await button('通知').click();
 for(const [label,value]of [['1 小时',60],['2 小时',120],['3 小时',180]]){await button(label).click();await page.waitForFunction(value=>JSON.parse(localStorage.getItem('tjmuse.data.v1')).settings.reminderMinutes===value,value);}
 await page.getByLabel('作业截止通知',{exact:true}).click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('tjmuse.data.v1')).settings.homeworkNotifications);
 assert.equal((await stored()).settings.todoNotifications,true);assert.equal((await stored()).settings.courseNotifications,true);await close();
 await button('清除历史对话').click();await page.waitForTimeout(250);let box=await page.locator('[data-testid="sheet-card"]:visible').boundingBox();assert.ok(box.height<350);await page.screenshot({path:'artifacts/history-020.png'});await close();
 await displaySettings();await page.waitForTimeout(200);box=await page.locator('[data-testid="sheet-card"]:visible').boundingBox();assert.ok(box.height<700);await close();
 await button('关于我们').click();await page.waitForTimeout(300);await page.screenshot({path:'artifacts/about-020.png'});console.log(JSON.stringify({aboutText:await page.locator('[data-testid="sheet-card"]:visible').allTextContents()}));await page.getByText('TJMuse 0.2.0',{exact:true}).waitFor();const copyright=page.getByText('© 2026 OrstaLogic. All rights reserved.',{exact:true});await copyright.waitFor();await page.waitForTimeout(200);box=await page.locator('[data-testid="sheet-card"]:visible').boundingBox();const rightsBox=await copyright.boundingBox();assert.ok(box.height<300);assert.ok(Math.abs(rightsBox.x+rightsBox.width/2-(box.x+box.width/2))<3);await close();
 for(const width of [320,393,768]){await page.setViewportSize({width,height:852});await displaySettings();await page.waitForTimeout(150);box=await page.locator('[data-testid="sheet-card"]:visible').boundingBox();assert.ok(box.height<=852*.92+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await close();}
 const beforeNoon=batches;
 const jumpTo=async time=>{const now=await page.evaluate(()=>Date.now());await page.clock.fastForward(new Date(time).getTime()-now);await page.waitForTimeout(250);};
 await jumpTo('2026-10-29T12:00:00.500+08:00');assert.equal(batches,beforeNoon+1);await page.clock.runFor(1000);
 await page.reload();await button('我的').waitFor();await page.waitForTimeout(250);assert.equal(batches,beforeNoon+1);assert.equal(await page.getByText(/请填写 Canvas 个人访问令牌/).count(),0);
 await connect();const afterManual=batches;assert.equal(afterManual,beforeNoon+2);await page.waitForTimeout(150);assert.equal(batches,afterManual);
 await jumpTo('2026-10-29T13:00:00.500+08:00');assert.equal(batches,afterManual);
 await jumpTo('2026-10-30T00:00:00.500+08:00');assert.equal(batches,afterManual+1);await page.clock.runFor(1000);
 await jumpTo('2026-10-30T00:01:00.500+08:00');await page.reload();await button('我的').waitFor();await page.waitForTimeout(200);assert.equal(batches,afterManual+1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',itemVisibility:true,undatedOptIn:true,globalDisplayRules:true,deletionSurvivesSyncAndReload:true,recovery:true,hourButtons:true,independentHomeworkSwitch:true,contentSizedSheets:true,centeredCopyrightAndVersion:true,noSyncOnNavigationOrFiveMinutes:true,noonAndMidnightOnly:true,autoSlotSurvivesReload:true,noCatchupAtOtherTimes:true,pageErrors:errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
