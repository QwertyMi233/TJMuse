const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:393,height:852},locale:'zh-CN'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const btn=n=>p.getByRole('button',{name:n,exact:true}),stored=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')));
 await p.goto('http://127.0.0.1:8081/me?demo=021');await btn('作业设置').click();await btn('智学盟设置').click();await btn('连接示例智学盟账号').click();await btn('取消连接').click();await p.waitForTimeout(1100);await btn('账号自动登录设置').waitFor();assert.equal((await stored()).zhixuemeng.connected,false);
 await btn('账号自动登录设置').click();await p.getByLabel('智学盟账号',{exact:true}).fill('fixture-account');await p.getByLabel('智学盟密码',{exact:true}).fill('fixture-test-password');await btn('同意仅在本机保存智学盟账号密码').click();await btn('保存并启用自动登录').click();
 await p.getByText('本机自动登录已开启',{exact:true}).waitFor();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('tjmuse.demo.data.v021')).zhixuemeng.connected);
 const saved=await stored();assert.equal(JSON.stringify(saved).includes('fixture-test-password'),false);assert.equal(JSON.stringify(saved).includes('fixture-account'),false);
 await btn('关闭').click();await btn('同步智学盟作业').waitFor();await btn('关闭').click();await btn('Canvas设置').waitFor();await btn('关闭').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});
 await btn('作业').click();await p.getByTestId('platform-zhixuemeng').waitFor();await btn('智学盟').click();await btn('查看作业 第9周作业').click();await p.getByText(/1\. 上传练习册第57页/).waitFor();assert.ok((await p.getByTestId('sheet-content').innerText()).includes('第60页'));
 await p.getByTestId('sheet-content').getByRole('button',{name:'完成作业 第9周作业',exact:true}).click();assert.equal((await stored()).zhixuemeng.assignments[0].completedOverride,true);await btn('删除作业').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});
 await p.getByRole('button',{name:/^查看已删除作业/}).click();await btn('恢复作业 第9周作业').click();await btn('关闭').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});assert.equal((await stored()).zhixuemeng.preferences['zhixuemeng:demo:work9'].deleted,false);
 await btn('一键同步所有平台作业').click();await p.waitForTimeout(1000);assert.equal((await stored()).zhixuemeng.assignments[0].completedOverride,true);
 await p.screenshot({path:'artifacts/preview-041-homework.png'});
 await btn('我的').click();await btn('编辑头像').click();await btn('选择国家或地区').click();await p.getByLabel('搜索国家或地区',{exact:true}).fill('Japan');await btn('日本 JP').click();await btn('保存个人资料').click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});await btn('语言').click();
 for(const [name,close,expected] of [['English (US)','Close','Japan'],['日本語','閉じる','日本'],['Español','Cerrar','Japón'],['Français','Fermer','Japon'],['繁體中文','關閉','日本'],['简体中文','关闭','日本']]){
  await p.getByRole('button',{name,exact:true}).click();assert.equal(await p.getByTestId('profile-region').innerText(),expected);await p.getByRole('button',{name:close,exact:true}).waitFor();
 }
 await btn('English (US)').click();await p.getByRole('button',{name:'Close',exact:true}).click();await p.getByTestId('sheet-card').waitFor({state:'hidden'});await p.screenshot({path:'artifacts/preview-041-region-english.png'});
 await p.reload();await p.getByTestId('profile-region').waitFor();assert.equal(await p.getByTestId('profile-region').innerText(),'Japan');assert.equal((await stored()).zhixuemeng.assignments[0].completedOverride,true);assert.deepEqual(errors,[]);
 const result={passed:true,thirdPlatformCard:true,manualLoginCancellation:true,savingCredentialsTriggersBackgroundSync:true,credentialsNotInAppData:true,allFourPageRequirementsVisible:true,completionDeleteRestoreAndSyncPreserved:true,countryChangesInSixLanguages:true,regionAndHomeworkPersistAfterReload:true,pageErrors:errors,nativeDeviceVerified:false};fs.writeFileSync('.build-tools/qa-v041-result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
