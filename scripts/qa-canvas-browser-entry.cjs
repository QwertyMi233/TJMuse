const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');require('tsx/cjs');
const {createDemoData}=require('../src/core/demo.ts');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const server=spawn(process.execPath,['scripts/serve-preview.cjs','8082'],{windowsHide:true,stdio:'ignore'});let browser;try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:8082')).ok)break;}catch{}if(i===59)throw Error('Preview server unavailable');await wait(100);}
 browser=await chromium.launch({channel:'msedge',headless:true});const c=await browser.newContext({viewport:{width:440,height:956},locale:'zh-CN'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-11-15T02:00:00Z')});
 const d=createDemoData();d.settings.language='zh-CN';for(const name of ['canvas','haoke','zhixuemeng'])d[name].connected=false;d.canvas.renewal=undefined;
 await c.addInitScript(data=>{localStorage.setItem('tjmuse.demo.data.v021',JSON.stringify(data));localStorage.setItem('tjmuse.demo.daily-overview.v1','2026-11-15');},d);
 const b=name=>p.getByRole('button',{name,exact:true}),card=p.getByTestId('sheet-card');await p.goto('http://127.0.0.1:8082/?demo=021');await b('我的').click();
 const initial=await p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).settings);
 async function canvas(){await b('作业设置').click();await b('Canvas设置').click();await p.getByLabel('Canvas 网站地址',{exact:true}).waitFor();}
 await canvas();await p.getByLabel('Canvas 网站地址',{exact:true}).fill('http://bad.example');await b('打开网页，读取并保存令牌').click();await card.getByText(/Canvas 地址需为 HTTPS/).waitFor();assert.equal(await card.count(),1,'invalid address must keep the form open');await b('关闭').click();await card.waitFor({state:'hidden'});
 for(let i=0;i<5;i++){
  await canvas();await p.getByLabel('Canvas 网站地址',{exact:true}).fill('https://canvas.tongji.edu.cn');await p.getByLabel('粘贴令牌',{exact:true}).fill('fixture-local-only');await b('打开网页，读取并保存令牌').click();
  await card.getByText('请在 iOS／Android 中使用官方网页登录；浏览器演示使用示例连接。',{exact:true}).waitFor();assert.equal(await card.count(),1);assert.equal(await p.getByLabel('粘贴令牌',{exact:true}).inputValue(),'fixture-local-only');
  await p.waitForFunction(()=>{const e=document.querySelector('[data-testid="attached-sheet-frame"]');if(!e)return false;const r=e.getBoundingClientRect();return Math.abs(r.bottom-innerHeight)<1&&r.top<innerHeight-200;});if(i===0)await p.screenshot({path:'artifacts/canvas35-recovered.png'});
  await b('关闭').click();await card.waitFor({state:'hidden'});await p.waitForTimeout(200);assert.equal(await card.count(),0);
 }
 await canvas();await p.getByLabel('Canvas 网站地址',{exact:true}).fill('https://canvas.tongji.edu.cn');await b('打开网页，读取并保存令牌').click();await p.getByTestId('canvas-browser-opening').waitFor();await b('取消连接').click();await p.getByTestId('canvas-browser-opening').waitFor({state:'hidden'});await card.waitFor({state:'hidden'});await p.waitForTimeout(1600);assert.equal(await card.count(),0,'cancel must not reopen a stale window');
 await b('关于我们').click();await card.getByText('TJMuse 0.5.1',{exact:true}).waitFor();await b('关闭').click();await card.waitFor({state:'hidden'});
 const settings=await p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).settings);assert.deepEqual(settings,initial);assert.deepEqual(errors,[]);
 const report={passed:true,invalidUrlKeepsSettingsUsable:true,unavailableHostRecoveryCycles:5,pastedTokenPreserved:true,openingCanBeCancelled:true,noStaleWindowAfterCancel:true,mainInterfaceStillResponds:true,allUserSettingsUnchanged:true,pageErrors:errors,nativeDeviceTested:false};fs.writeFileSync('.build-tools/qa-canvas-browser35.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
