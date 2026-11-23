const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({viewport:{width:393,height:852},locale:'zh-CN'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.clock.install({time:new Date('2026-10-31T08:00:00+08:00')});
  await page.goto('http://127.0.0.1:8081/homework?demo=021');
  const button=name=>page.getByRole('button',{name,exact:true});
  const close=async()=>{await button('关闭').click();};
  const openCanvas=async()=>{await button('Canvas 自动更换令牌').click();await button('学号密码自动登录设置').click();await page.getByTestId('sheet-card').getByText('Canvas 学号自动登录',{exact:true}).waitFor();};
  const leaveCanvas=async()=>{await close();await page.getByTestId('sheet-card').getByText('Canvas 自动更换令牌',{exact:true}).waitFor();await close();await page.getByTestId('sheet-card').waitFor({state:'hidden'});};
  const openHaoke=async()=>{await button('好课学号自动登录设置').click();await page.getByTestId('sheet-card').getByText('好课学号自动登录',{exact:true}).waitFor();};
  const save=async(id,password)=>{
    assert.equal(await button('保存并启用自动登录').isDisabled(),true);
    const field=page.getByLabel('学号登录密码',{exact:true});assert.equal(await field.getAttribute('type'),'password');
    await page.getByLabel('学校学号',{exact:true}).fill(id);await field.fill(password);await button('同意仅在本机安全保存学号和密码').click();await button('保存并启用自动登录').click();await page.getByText('本机自动登录已开启',{exact:true}).waitFor();assert.equal(await field.inputValue(),'');
  };
  await openCanvas();await save('20260001','canvas-fixture-only');await leaveCanvas();
  await openHaoke();await page.getByText('本机自动登录未开启',{exact:true}).waitFor();await save('20260002','haoke-fixture-only');
  await page.getByText('202••••02 · 准备就绪',{exact:true}).waitFor();await page.waitForTimeout(300);await page.screenshot({path:'artifacts/preview-021-haoke-autofill.png'});
  const stored=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
  for(const value of ['canvas-fixture-only','haoke-fixture-only','tjmuse.tongji.student-login.v1','tjmuse.haoke.student-login.v1'])assert.equal(stored.includes(value),false);
  await close();await page.getByTestId('sheet-card').waitFor({state:'hidden'});await openCanvas();await page.getByText('202••••01 · 准备就绪',{exact:true}).waitFor();await leaveCanvas();
  await openHaoke();await button('关闭并删除本机登录信息').click();await page.getByText('本机自动登录未开启',{exact:true}).waitFor();await close();await page.getByTestId('sheet-card').waitFor({state:'hidden'});
  await openCanvas();await page.getByText('本机自动登录已开启',{exact:true}).waitFor();await leaveCanvas();
  await page.reload();await openCanvas();await page.getByText('本机自动登录未开启',{exact:true}).waitFor();assert.deepEqual(errors,[]);
  const result={passed:true,independentPlatformSettings:true,explicitConsent:true,passwordMaskedAndCleared:true,notInOrdinaryStorage:true,independentDeletion:true,webDemoMemoryOnly:true,pageErrors:errors};fs.writeFileSync('.build-tools/qa-login-settings-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
