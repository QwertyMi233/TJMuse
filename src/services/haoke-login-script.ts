export const HAOKE_STUDENT_LOGIN_URL='https://passport.aihaoke.net/auth/login?tenantSiteUrl=https%3A%2F%2Ftongji.aihaoke.net&locale=zh-CN';
export function trustedHaokeLoginPage(raw:string){
  try{const url=new URL(raw),school=new URL(url.searchParams.get('tenantSiteUrl')||'');return url.origin==='https://passport.aihaoke.net'&&!url.username&&!url.password&&url.pathname==='/auth/login'&&school.origin==='https://tongji.aihaoke.net'&&!school.username&&!school.password;}catch{return false;}
}
export function haokeStudentLoginScript(nonce:string,credentials?:{studentId:string;password:string}){
  return `(async function(){
    if(window.top!==window.self||location.origin!=='https://passport.aihaoke.net'||location.pathname!=='/auth/login')return;
    try{const school=new URL(new URL(location.href).searchParams.get('tenantSiteUrl')||'');if(school.origin!=='https://tongji.aihaoke.net'||school.username||school.password)return;}catch(_){return;}
    const nonce=${JSON.stringify(nonce)},credentials=${JSON.stringify(credentials||null)};
    const send=status=>window.ReactNativeWebView.postMessage(JSON.stringify({nonce,kind:'haoke-student-login',status}));
    const visible=el=>!!el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
    function chooseMode(){if(window.__tjmuseHaokeModeChosen)return;const tabs=[...document.querySelectorAll('.tab-item')].filter(el=>visible(el)&&el.textContent.replace(/\\s+/g,'')==='学号/教师工号');if(tabs.length===1){window.__tjmuseHaokeModeChosen=true;if(!tabs[0].classList.contains('active'))tabs[0].click();}}
    function fields(){
      const forms=[...document.querySelectorAll('form.tab-pane.active')].filter(visible);if(forms.length!==1)return null;const form=forms[0];
      if(form.querySelector('.el-select__placeholder')?.textContent.trim()!=='同济大学')return null;
      if(form.hasAttribute('action')){try{const action=new URL(form.action,location.href);if(action.origin!==location.origin||action.pathname!=='/auth/login')return null;}catch(_){return null;}}
      const users=[...form.querySelectorAll('input[placeholder="请输入学号/教工号"]')].filter(visible),passwords=[...form.querySelectorAll('input[type="password"]')].filter(visible),labels=[...form.querySelectorAll('label.el-checkbox')].filter(el=>visible(el)&&el.textContent.replace(/\\s+/g,'')==='一周内自动登录'),button=form.querySelector('button.submit-btn[type="submit"]');
      if(users.length!==1||passwords.length!==1||labels.length!==1||!visible(button))return null;
      const remember=labels[0].querySelector('input[type="checkbox"]');return remember?{form,user:users[0],pass:passwords[0],label:labels[0],remember,button}:null;
    }
    function selectRemember(value){if(!value)return false;if(!window.__tjmuseHaokeRemember&&!value.remember.checked)value.label.click();if(value.remember.checked&&!window.__tjmuseHaokeRemember){window.__tjmuseHaokeRemember=true;send('remember-selected');}return value.remember.checked;}
    const challenge=()=>[...document.querySelectorAll('input[autocomplete="one-time-code"],input[placeholder*="验证码"],[class*="captcha"],.geetest_panel,.verifybox')].some(visible);
    const errors=()=>[...document.querySelectorAll('.el-message--error,.el-form-item__error,[role="alert"]')].filter(visible).map(el=>el.textContent.trim()).join(' ');
    const rejected=()=>/(?:账号|学号|工号|用户|密码).*(?:错误|不正确|不存在|不匹配)|(?:incorrect|invalid).*(?:password|username)/i.test(errors());
    try{
      if(!credentials){
        if(window.__tjmuseHaokeProbe===nonce)return;window.__tjmuseHaokeProbe=nonce;let reported=false,failed=false;
        const inspect=()=>{chooseMode();const value=fields();if(value)selectRemember(value);if(value&&!reported){reported=true;send('form-ready');}if(window.__tjmuseHaokeSubmitted&&!failed&&(challenge()||rejected())){failed=true;send(challenge()?'verification-required':'credentials-rejected');}};
        if(window.__tjmuseHaokeObserver)window.__tjmuseHaokeObserver.disconnect();const observer=new MutationObserver(inspect);window.__tjmuseHaokeObserver=observer;observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});inspect();const poll=setInterval(inspect,350);setTimeout(()=>{observer.disconnect();clearInterval(poll);},120000);return;
      }
      if(window.__tjmuseHaokeAttempted)return;window.__tjmuseHaokeAttempted=true;const value=fields();
      if(!value||!/^\\d{6,20}$/.test(credentials.studentId)||!credentials.password||!selectRemember(value)){send('page-not-ready');return;}
      const set=(input,text)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
      set(value.user,credentials.studentId);set(value.pass,credentials.password);await new Promise(resolve=>setTimeout(resolve,200));
      const current=fields();if(challenge()||rejected()){send(challenge()?'verification-required':'credentials-rejected');return;}
      if(!current||current.form!==value.form||!current.remember.checked||current.user.value!==credentials.studentId||current.pass.value!==credentials.password||current.button.disabled||current.button.getAttribute('aria-disabled')==='true'){send('page-not-ready');return;}
      window.__tjmuseHaokeSubmitted=true;send('submitting');current.button.click();
    }catch(_){send('page-not-ready');}
  })();true;`;
}
export function haokeReadSessionScript(nonce:string){
  return `(function(){if(window.top!==window.self||location.origin!=='https://tongji.aihaoke.net')return;
    window.__tjmuseHaokeRead?.stop();
    let sent=false,busy=false,stopped=false,timer,deadline,controller=null;const checked=new Map();
    const valid=value=>typeof value==='string'&&/^[!-~]{1,4096}$/.test(value);
    const stop=()=>{stopped=true;clearInterval(timer);clearTimeout(deadline);controller?.abort();};
    window.__tjmuseHaokeRead={stop};
    const send=(token,status)=>{if(sent||stopped)return;sent=true;stop();window.ReactNativeWebView.postMessage(JSON.stringify({nonce:${JSON.stringify(nonce)},kind:'haoke',token,status}));};
    const candidates=()=>{const values=[];const add=value=>{if(valid(value)&&!values.includes(value))values.push(value);};
      try{add(new URL(location.href).searchParams.get('haoke-token'));}catch(_){}
      try{for(const part of document.cookie.split(';')){const text=part.trim();if(text.startsWith('haoke-token=')){try{add(decodeURIComponent(text.slice(12)));}catch(_){}}}}catch(_){}
      try{add(sessionStorage.getItem('haoke-token'));}catch(_){}
      try{add(localStorage.getItem('haoke-token'));add(localStorage.getItem('ctToken'));}catch(_){}
      return values;
    };
    const verify=async token=>{
      const c=new AbortController();controller=c;let timeout;
      const interrupted=new Promise((_,reject)=>{c.signal.addEventListener('abort',()=>reject(new Error('interrupted')),{once:true});timeout=setTimeout(()=>c.abort(),5000);});
      try{return await Promise.race([interrupted,(async()=>{
        const requestId='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16);});
        const response=await fetch('https://tongji.aihaoke.net/api/auth/queryCurrentUserInfo',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Language':'zh-CN'},body:JSON.stringify({requestId}),credentials:'omit',redirect:'error',signal:c.signal});
        if(!response.ok||response.redirected||response.url&&new URL(response.url).origin!==location.origin)return null;
        const value=await response.json();
        if(Number(value?.code)!==200||!/^\\d{1,30}$/.test(String(value.data?.userInfo?.userId)))return null;
        return valid(value.data.token)?value.data.token:token;
      })()]);}finally{clearTimeout(timeout);if(controller===c)controller=null;}
    };
    const read=async()=>{if(sent||busy||stopped)return;busy=true;
      try{for(const token of candidates()){
        if(stopped)break;if(checked.has(token)&&Date.now()-checked.get(token)<2000)continue;checked.set(token,Date.now());
        try{const verified=await verify(token);if(!stopped&&verified){send(verified,'ok');break;}}catch(_){}
      }}finally{busy=false;}
    };
    timer=setInterval(()=>void read(),350);deadline=setTimeout(()=>send('','timeout'),25000);void read();
  })();true;`;
}
