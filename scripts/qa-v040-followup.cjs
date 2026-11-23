const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:393,height:852},locale:'zh-CN'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const btn=name=>p.getByRole('button',{name,exact:true});
 await p.goto('http://127.0.0.1:8081/?demo=021');await btn('我的').waitFor();
 const selected=()=>p.locator('[data-testid^="day-content-"]').evaluateAll(nodes=>nodes.find(n=>!n.closest('[aria-hidden=true]')).dataset.testid.slice(12));
 const day=await selected(),next=new Date(day+'T12:00:00');next.setDate(next.getDate()+1);const key=next.toISOString().slice(0,10),r=await p.getByTestId('day-pager').boundingBox(),x=r.x+r.width*.85,y=r.y+90;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-r.width*.65,y,{steps:15});
 await p.waitForFunction(key=>getComputedStyle(document.querySelector('[data-testid="date-highlight-'+key+'"]')).opacity==='1',key);
 assert.equal(await selected(),day);assert.equal(await p.getByTestId('date-highlight-'+key).evaluate(e=>getComputedStyle(e).opacity),'1');await p.mouse.up();await p.waitForFunction(key=>[...document.querySelectorAll('[data-testid^="day-content-"]')].some(n=>!n.closest('[aria-hidden=true]')&&n.dataset.testid==='day-content-'+key),key);
 await btn('我的').click();await btn('作业设置').click();await btn('好课设置').click();assert.equal(await p.getByTestId('sheet-card').count(),1);
 const backdrop=await p.getByTestId('app-backdrop').evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(backdrop,'rgb(255, 255, 255)');
 await p.getByRole('button',{name:/^(重新登录好课|连接示例好课账户)$/}).click();await btn('取消连接').waitFor();assert.equal(await p.getByTestId('sheet-card').count(),0);
 await btn('取消连接').click();await p.waitForTimeout(1100);await btn('学号自动登录设置').waitFor();await btn('关闭').click();await btn('Canvas设置').waitFor();await btn('关闭').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});await btn('AI').click();await btn('我的').click();await btn('个性化设置').waitFor();
 // Record actual running animation, not just a pair of static mockups.
 const context=await b.newContext({viewport:{width:393,height:852},locale:'zh-CN'}),a=await context.newPage();
 await a.goto('http://127.0.0.1:8081/?demo=021&welcome=1');await a.waitForFunction(()=>document.querySelector('[data-testid="onboarding"]')?.getAttribute('aria-busy')==='false');
 await a.screenshot({path:'artifacts/onboarding-build25-start.png'});const start=await a.getByTestId('aura-front-layer').evaluate(e=>getComputedStyle(e).transform);fs.mkdirSync('artifacts/onboarding-build25-frames',{recursive:true});for(let i=0;i<42;i++){await a.screenshot({path:'artifacts/onboarding-build25-frames/frame-'+String(i).padStart(3,'0')+'.png'});await a.waitForTimeout(110);}assert.notEqual(await a.getByTestId('aura-front-layer').evaluate(e=>getComputedStyle(e).transform),start);await a.screenshot({path:'artifacts/onboarding-build25-end.png'});await context.close();
 assert.deepEqual(errors,[]);const result={passed:true,calendarHighlightBeforeScrollSettles:true,neutralSheetSurroundings:true,manualLoginDoesNotReopenParentModal:true,pendingLoginCancellable:true,appInteractiveAfterCancel:true,visibleBlueLayerAnimation:true,pageErrors:errors,nativeDeviceVerified:false};fs.writeFileSync('.build-tools/qa-v040-followup-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
