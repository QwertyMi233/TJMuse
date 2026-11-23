const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
require('tsx/cjs');const {createDemoData}=require('../src/core/demo.ts');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const c=await browser.newContext({viewport:{width:440,height:956},locale:'zh-CN'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-11-12T04:00:00Z')});
 const d=createDemoData();d.haoke={...d.haoke,connected:true,userId:'20001'};d.zhixuemeng={...d.zhixuemeng,connected:true,userId:'demo-zxm-user'};d.courseExceptions={};d.timetables=[{id:'repair-table',name:'编辑验证课表',enabled:true,semesterStartDate:'2026-11-09',weekStartsOn:1,importedAt:'2026-11-09T00:00:00Z',periods:d.settings.lessonPeriods,sessions:[{id:'repair-course',title:'编辑验证课程',teacher:'测试教师',location:'北101',weekday:4,startPeriod:5,endPeriod:6,weeks:[1,2,3],color:'#0066B3'}]}];
 await c.addInitScript(data=>{localStorage.setItem('tjmuse.demo.data.v021',JSON.stringify(data));localStorage.setItem('tjmuse.demo.daily-overview.v1','2026-11-12');},d);
 const b=name=>p.getByRole('button',{name,exact:true}),close=()=>b('关闭').click(),card=p.getByTestId('sheet-card');
 await p.goto('http://127.0.0.1:8081/?demo=021');await b('我的').waitFor();if(await p.getByTestId('daily-overview').isVisible())await b('开始今天').click();await b('我的').click();
 const structures=[];
 for(const [name,label] of [['好课','学号／教师工号'],['智学盟','智学盟账号']]){
  await b('作业设置').click();await b(name+'设置').click();await b('账号自动登录设置').click();await p.getByLabel(label,{exact:true}).fill(name==='好课'?'20260001':'zxm-fixture');await p.getByLabel('登录密码',{exact:true}).fill('fixture-ui-only');
  await b('同意仅在本机安全保存账号密码').click();await b('保存并启用自动登录').click();await card.getByText('已开启后台自动登录',{exact:true}).waitFor();assert.equal(await p.getByLabel('登录密码',{exact:true}).inputValue(),'');
  structures.push(await card.getByRole('button').allTextContents());await p.screenshot({path:`artifacts/repair33-${name==='好课'?'haoke':'zhixuemeng'}-settings.png`});await close();await card.waitFor({state:'hidden'});
 }
 const normalize=rows=>rows.map(t=>t.replace(/好课|智学盟/g,'平台'));assert.deepEqual(normalize(structures[0]),normalize(structures[1]));
 await b('作业设置').click();await b('Canvas设置').click();await b('打开网页，读取并保存令牌').waitFor();assert.equal(await b('打开网页，读取并保存令牌').count(),1);assert.equal(await p.getByLabel('粘贴令牌',{exact:true}).count(),1);await close();await card.waitFor({state:'hidden'});
 await b('课程表').click();await p.getByRole('button',{name:/^课程 编辑验证课程 /}).click();await b('编辑课程').click();await b('编辑全部教学周').click();await b('保存课程更改').waitFor();await p.getByLabel('课程名称',{exact:true}).fill('手动修改已保存');await p.getByLabel('上课地点',{exact:true}).fill('北301');await b('保存课程更改').click();
 await p.getByRole('button',{name:/^课程 手动修改已保存 /}).waitFor();await p.getByRole('button',{name:/^课程 手动修改已保存 /}).click();await b('编辑课程').click();await b('删除本次课程').click();await b('确认').click();await p.getByRole('button',{name:/^课程 手动修改已保存 /}).waitFor({state:'hidden'});
 await b('课表下一周').click();await p.getByRole('button',{name:/^课程 手动修改已保存 /}).waitFor();await p.getByRole('button',{name:/^课程 手动修改已保存 /}).click();await b('编辑课程').click();await b('编辑全部教学周').click();await b('删除这条课程排课').click();await b('确认').click();await p.getByRole('button',{name:/^课程 手动修改已保存 /}).waitFor({state:'hidden'});
 const storage=await p.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert.ok(!storage.includes('fixture-ui-only'));assert.deepEqual(errors,[]);
 const result={passed:true,sharedPlatformSettings:true,saveStartsBackgroundDemo:true,credentialsNotInAppData:true,canvasReadSaveEntry:true,manualCourseEditPersists:true,deleteOneOccurrencePreservesOtherWeeks:true,deleteCourseRecord:true,pageErrors:errors,nativeKeyboardVerified:false,liveWebsiteLoginVerified:false};fs.writeFileSync('.build-tools/qa-platform-course-repair33.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
