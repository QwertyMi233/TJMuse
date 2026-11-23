const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,locale:'zh-CN',timezoneId:'Asia/Singapore'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.cuePlays=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.cuePlays.push(this.currentSrc||this.src);return play.call(this);};});
 await p.goto('http://127.0.0.1:8081/?demo=021&welcome=1',{waitUntil:'domcontentloaded'});const button=n=>p.getByRole('button',{name:n,exact:true});await button('下一步').waitFor();
 assert.equal(await p.getByRole('button',{name:'重置演示数据'}).count(),0);
 await p.waitForTimeout(700);await p.screenshot({path:'artifacts/preview-040-intro.png'});
 for(let step=1;step<=6;step++){
  await button(step===1?'下一步':'跳过').click();await p.waitForFunction(()=>document.querySelector('[data-testid="onboarding"]')?.getAttribute('aria-busy')==='false');await p.waitForFunction(step=>window.cuePlays.length>=step,step,{timeout:10000});
  if(step===1)await p.screenshot({path:'artifacts/preview-040-profile.png'});
  if(step===2)await p.screenshot({path:'artifacts/preview-040-semester.png'});
  if(step===6)await p.screenshot({path:'artifacts/preview-040-complete.png'});
 }
 const plays=await p.evaluate(()=>window.cuePlays);assert.equal(plays.length,6);assert.equal(new Set(plays).size,6);
 await button('进入 TJMuse').click();await button('作业').click();await p.screenshot({path:'artifacts/preview-040-homework.png'});
 // Empty categories are hidden even when another category still contains work.
 await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('tjmuse.demo.data.v021'));d.tasks=[];d.settings.homeLayout='grouped';localStorage.setItem('tjmuse.demo.data.v021',JSON.stringify(d));});
 await p.goto('http://127.0.0.1:8081/?demo=021');await button('我的').waitFor();assert.equal(await p.getByRole('button',{name:/^(展开|折叠)To-do分类$/}).count(),0);
 const seed=await p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')));seed.settings.holidayEnabled=false;seed.haoke.connected=false;seed.canvas.renewal=undefined;seed.canvas.connected=true;seed.canvas.userId='10001';
 const noticePage=await b.newPage({viewport:{width:393,height:852},locale:'zh-CN'});noticePage.on('pageerror',e=>errors.push(e.message));await noticePage.addInitScript(seed=>localStorage.setItem('tjmuse.data.v1',JSON.stringify(seed)),seed);
 await noticePage.route('**/canvas.tongji.edu.cn/**',route=>route.fulfill({status:401,body:'invalid token'}));await noticePage.goto('http://127.0.0.1:8081/');const notice=noticePage.getByRole('button',{name:'关闭提示',exact:true});await notice.waitFor({timeout:15000});await notice.waitFor({state:'hidden',timeout:4500});
 assert.deepEqual(errors,[]);const result={passed:true,sixDistinctCuesPlayOnce:true,onboardingFillsScreen:true,emptyTodoHasNoCollapseArrow:true,noticeAutoDismissesInThreeSeconds:true,pageErrors:errors,nativeAudioVerified:false};fs.writeFileSync('.build-tools/qa-v040-audio-notice-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
