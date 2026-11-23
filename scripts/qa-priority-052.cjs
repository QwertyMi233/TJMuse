const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process');
require('tsx/cjs');
const {createDemoData}=require('../src/core/demo.ts');
const server=spawn(process.execPath,['scripts/serve-preview.cjs','8082'],{windowsHide:true,stdio:'ignore'});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:440,height:956},locale:'zh-CN'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-19T04:00:00Z')});
  const data=createDemoData();data.settings.language='zh-CN';data.settings.onboardingCompleted=true;
  data.tasks=[{id:'priority',title:'优先级测试',description:'',location:'',date:'2026-11-19',time:'23:00',duration:30,color:'#0066B3',kind:'todo',repeat:null,subtasks:[],completedDates:[]}];
  data.flexibleTasks=[{id:'flex-priority',title:'自由优先级测试',description:'',completed:false}];
  await context.addInitScript(d=>{localStorage.setItem('tjmuse.demo.data.v021',JSON.stringify(d));localStorage.setItem('tjmuse.demo.daily-overview.v1','2026-11-19');},data);
  const button=name=>page.getByRole('button',{name,exact:true}),switcher=name=>page.getByRole('switch',{name,exact:true}),card=page.getByTestId('sheet-card');
  for(let attempt=0;;attempt++){try{await page.goto('http://127.0.0.1:8082/?demo=021');break;}catch(e){if(attempt===8)throw e;await new Promise(r=>setTimeout(r,150));}}
  await button('编辑 优先级测试').click();await switcher('重要').waitFor();assert.equal(await switcher('重要').isChecked(),false);assert.equal(await switcher('紧急').isChecked(),false);
  await switcher('重要').check();await switcher('紧急').check();await page.getByText('重要紧急',{exact:true}).waitFor();
  await page.waitForTimeout(450);await page.screenshot({path:'artifacts/priority37-todo.png'});
  await button('保存更改').click();await card.waitFor({state:'hidden'});
  await button('编辑 优先级测试').click();await switcher('重要').waitFor();assert.ok(await switcher('重要').isChecked());assert.ok(await switcher('紧急').isChecked());
  await switcher('紧急').uncheck();await button('关闭').click();await card.waitFor({state:'hidden'});
  await button('AI').click();await button('编辑自由事项 自由优先级测试').click();await switcher('重要').waitFor();assert.equal(await switcher('重要').isChecked(),false);
  await switcher('紧急').check();await page.getByText('不重要紧急',{exact:true}).waitFor();await page.waitForTimeout(450);await page.screenshot({path:'artifacts/priority37-flexible.png'});await button('保存更改').click();await card.waitFor({state:'hidden'});
  await page.waitForFunction(()=>{const d=JSON.parse(localStorage.getItem('tjmuse.demo.data.v021'));return d.flexibleTasks[0].urgent===true;});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')));
  assert.equal(saved.tasks[0].important,true);assert.equal(saved.tasks[0].urgent,true);assert.equal(saved.flexibleTasks[0].important,false);assert.equal(saved.flexibleTasks[0].urgent,true);
  assert.deepEqual(errors,[]);
  const report={passed:true,todoDefaultBothOff:true,todoFlagsPersist:true,cancelDoesNotSave:true,flexibleFlagsPersist:true,pageErrors:errors,nativeWidgetTested:false};
  fs.writeFileSync('.build-tools/qa-priority37.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
