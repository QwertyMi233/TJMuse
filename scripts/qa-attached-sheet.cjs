const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({viewport:{width:440,height:956},locale:'zh-CN'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  await page.goto('http://127.0.0.1:8081/me?demo=021',{waitUntil:'domcontentloaded'});
  await button('关于我们').click();
  const frame=page.getByTestId('attached-sheet-frame'),card=page.getByTestId('sheet-card');
  await card.waitFor();await page.waitForTimeout(350);
  const cases=[];
  for(const [width,height] of [[440,956],[393,852],[375,667],[320,568]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(200);
    const box=await frame.boundingBox(),shape=await frame.evaluate(e=>{const s=getComputedStyle(e);return {tl:parseFloat(s.borderTopLeftRadius),tr:parseFloat(s.borderTopRightRadius),bl:parseFloat(s.borderBottomLeftRadius),br:parseFloat(s.borderBottomRightRadius)}});
    assert.ok(Math.abs(box.x)<1);assert.ok(Math.abs(box.width-width)<1);assert.ok(Math.abs(box.y+box.height-height)<1);
    assert.equal(shape.bl,0);assert.equal(shape.br,0);assert.equal(shape.tl,width*.125);assert.equal(shape.tr,width*.125);
    const close=await button('关闭').boundingBox();assert.ok(close.x>=0&&close.x+close.width<=width&&close.y>=box.y);
    assert.equal(await page.getByText('Close',{exact:true}).count(),0);
    cases.push({width,height,flushLeftRightBottom:true,topRadius:shape.tl});
  }
  await page.setViewportSize({width:440,height:956});await page.waitForTimeout(200);
  await page.screenshot({path:'artifacts/preview-022-attached-sheet.png'});
  await button('关闭').click();await card.waitFor({state:'hidden'});
  for(const name of ['清除历史对话','作业显示设置','主题颜色','AI 设置']){
    const grouped=['作业显示设置','主题颜色'].includes(name);if(grouped)await button('个性化设置').click();
    await button(name).click();await card.waitFor();await page.waitForTimeout(600);const r=await frame.boundingBox();assert.ok(Math.abs(r.y+r.height-956)<1&&r.width===440);await button('关闭').click();
    if(grouped){await button('主题颜色').waitFor();await button('关闭').click();}await card.waitFor({state:'hidden'});
  }
  await button('关于我们').click();await card.waitFor();await page.waitForTimeout(600);
  const grip=page.getByTestId('sheet-drag-handle');let r=await grip.boundingBox(),short=await frame.boundingBox();
  await page.mouse.move(r.x+75,r.y+20);await page.mouse.down();await page.mouse.move(r.x+75,r.y-100,{steps:14});await page.mouse.up();await page.waitForTimeout(400);
  const expanded=await frame.boundingBox();assert.ok(expanded.height>short.height+100);assert.ok(Math.abs(expanded.y+expanded.height-956)<1);
  await button('关闭').click();await card.waitFor({state:'hidden'});
  await button('关于我们').click();await card.waitFor();await page.waitForTimeout(600);r=await grip.boundingBox();assert.ok(Math.abs((await frame.boundingBox()).height-short.height)<2);
  await page.mouse.move(r.x+75,r.y+20);await page.mouse.down();await page.mouse.move(r.x+75,r.y+200,{steps:14});await page.mouse.up();await card.waitFor({state:'hidden'});
  await button('关于我们').click();await card.waitFor();await button('关闭').click();await card.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  const result={passed:true,cases,explicitCloseIconWeb:true,shortAndLongMenus:true,expandAttached:true,dragDismiss:true,reopenAfterDrag:true,pageErrors:errors,nativeDeviceVerified:false};
  fs.writeFileSync('.build-tools/qa-attached-sheet-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
