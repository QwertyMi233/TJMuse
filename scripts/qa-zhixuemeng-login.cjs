const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('fs');require('tsx/cjs');
const {zhixuemengLoginScript,ZHIXUEMENG_LOGIN}=require('../src/services/zhixuemeng-page.ts');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const c=await browser.newContext({...devices['Pixel 7']}),p=await c.newPage();let captured=null,forwarded=0;
 await p.route('**/jeecg-boot/**',route=>{const r=route.request(),u=new URL(r.url());if(r.method()==='POST'){
  if(u.pathname==='/jeecg-boot/sys/mLogin')captured=r.postDataJSON();else forwarded++;
  return route.fulfill({contentType:'application/json',body:JSON.stringify({success:false,code:400,message:'本机只读测试已拦截'})});
 }return route.continue();});
 await p.goto(ZHIXUEMENG_LOGIN,{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForSelector('input[type=password]');await p.evaluate(()=>{window.events=[];window.ReactNativeWebView={postMessage:t=>window.events.push(JSON.parse(t))};});
 await p.evaluate(zhixuemengLoginScript('fixture-login'));await p.waitForFunction(()=>window.events.some(e=>e.status==='form-ready'));
 await p.evaluate(zhixuemengLoginScript('fixture-login',{studentId:'fixture-account',password:'fixture-test-password'}));
 for(let i=0;i<60&&!captured;i++)await p.waitForTimeout(100);
 assert.ok(captured,'Official login action not reached');assert.equal(captured.username,'fixture-account');assert.equal(captured.password,'fixture-test-password');assert.equal(forwarded,0);
 const result={passed:true,realMobileFrontend:true,mobileUserAgent:await p.evaluate(()=>navigator.userAgent.includes('Mobile')),autoFillUsesOfficialLoginAction:true,authRequestsForwarded:0};
 fs.writeFileSync('.build-tools/qa-zxm-login-result.json',JSON.stringify(result));console.log(JSON.stringify(result));await c.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
