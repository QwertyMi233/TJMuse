const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,locale:'zh-CN'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  const set=Storage.prototype.setItem;window.dataWrites=0;
  Storage.prototype.setItem=function(key,value){if(key==='tjmuse.demo.data.v021')window.dataWrites++;return set.call(this,key,value);};
 });
 const btn=name=>p.getByRole('button',{name,exact:true}),idle=()=>p.waitForFunction(()=>document.querySelector('[data-testid="onboarding"]')?.getAttribute('aria-busy')==='false');
 const stored=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')));
 await p.goto('http://127.0.0.1:8081/?demo=021&welcome=1');await idle();
 assert.equal(await p.locator('[data-testid^="aura-texture-"]').count(),2);
 const shape=await p.getByTestId('aura-texture-back').getAttribute('style'),layer=p.getByTestId('aura-back-layer'),transform=await layer.evaluate(e=>getComputedStyle(e).transform);
 await p.waitForTimeout(900);assert.equal(await p.getByTestId('aura-texture-back').getAttribute('style'),shape);assert.notEqual(await layer.evaluate(e=>getComputedStyle(e).transform),transform);
 await btn('下一步').click();await idle();assert.equal(await p.getByTestId('onboarding-aura').count(),0);
 const input=p.getByLabel('昵称',{exact:true}),before=(await stored()).profile.nickname;
 await input.focus();await p.waitForTimeout(200);
 const color=await p.getByTestId('onboarding-colored-title').evaluate(e=>getComputedStyle(e).color),writes=await p.evaluate(()=>window.dataWrites);
 await input.fill('');await input.pressSequentially('A calm and responsive name',{delay:20});await p.waitForTimeout(750);
 assert.equal((await stored()).profile.nickname,before);assert.equal(await p.evaluate(()=>window.dataWrites),writes);
 assert.equal(await input.inputValue(),'A calm and responsive name');assert.equal(await p.getByTestId('onboarding-colored-title').evaluate(e=>getComputedStyle(e).color),color);
 await input.blur();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).profile.nickname==='A calm and responsive name');
 const resumed=await p.getByTestId('onboarding-colored-title').evaluate(e=>getComputedStyle(e).color);await p.waitForTimeout(900);assert.notEqual(await p.getByTestId('onboarding-colored-title').evaluate(e=>getComputedStyle(e).color),resumed);
 await p.reload();await idle();assert.equal(await p.getByLabel('昵称',{exact:true}).inputValue(),'A calm and responsive name');
 // Save also when Next is pressed with the keyboard/input still focused.
 await p.getByLabel('昵称',{exact:true}).fill('Saved on Next');await btn('下一步').click();await idle();assert.equal((await stored()).profile.nickname,'Saved on Next');
 for(let n=2;n<6;n++){await btn('跳过').click();await idle();}await btn('进入 TJMuse').click();await btn('我的').click();
 const divider=p.getByTestId('language-notifications-divider');await divider.waitFor();assert.ok(await divider.isVisible());
 const bounds=await divider.boundingBox();assert.ok(bounds.height>=1&&bounds.width>200);
 await btn('语言').click();await btn('English (US)').click();await btn('Close').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});
 await p.goto('http://127.0.0.1:8081/?demo=021');const today=p.getByRole('button',{name:'Go to today',exact:true});await today.waitFor();
 for(const width of [320,375,393,430]){
  await p.setViewportSize({width,height:852});await p.waitForTimeout(150);
  const fit=await today.evaluate(e=>{const r=e.getBoundingClientRect(),text=[...e.querySelectorAll('[dir="auto"]')].find(n=>n.textContent==='Today'),t=text.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(text);const ink=range.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,textLeft:t.left,textRight:t.right,inkWidth:ink.width,textWidth:t.width,scroll:text.scrollWidth,client:text.clientWidth};});
  assert.ok(fit.left>=0&&fit.right<=width&&fit.width>=44&&fit.height>=44,JSON.stringify(fit));
  assert.ok(fit.textLeft>=fit.left+8&&fit.textRight<=fit.right-8&&fit.inkWidth<=fit.textWidth+.5&&fit.scroll<=fit.client,JSON.stringify(fit));
 }
 await p.screenshot({path:'artifacts/preview-040-build24-today.png'});assert.deepEqual(errors,[]);
 const result={passed:true,cachedLayerAnimation:true,noPerFrameTextureContentUpdates:true,noAuraMountedOnPaperSteps:true,nicknameTypingDoesNotWriteGlobalStorage:true,titleAnimationPausedDuringInput:true,titleAnimationResumesAfterBlur:true,nicknameSavedOnBlurReloadAndNext:true,languageNotificationsDividerVisible:true,englishTodayFits320Through430:true,pageErrors:errors,nativeDevicePerformanceMeasured:false};
 fs.writeFileSync('.build-tools/qa-v040-performance-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
