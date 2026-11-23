// Canvas creates the OpenID Connect state; retain its callback and IAM form.
export const TONGJI_STUDENT_LOGIN_URL='https://canvas.tongji.edu.cn/login/openid_connect';
export function trustedTongjiIdpPage(raw:string) {
  try {const u=new URL(raw);return u.origin==='https://iam.tongji.edu.cn'&&!u.username&&!u.password&&['/idp/AuthnEngine','/idp/authcenter/ActionAuthChain'].includes(u.pathname);}catch{return false;}
}
export const trustedTongjiLoginPage=trustedTongjiIdpPage;
export function tongjiStudentLoginScript(nonce:string,credentials?:{studentId:string;password:string}) {
  return `(async function(){
    if(window.top!==window||location.origin!=='https://iam.tongji.edu.cn'||!['/idp/AuthnEngine','/idp/authcenter/ActionAuthChain'].includes(location.pathname))return;
    const nonce=${JSON.stringify(nonce)},credentials=${JSON.stringify(credentials||null)};
    const send=status=>window.ReactNativeWebView.postMessage(JSON.stringify({nonce,kind:'student-login',status}));
    const visible=el=>!!el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
    function fields(){
      const form=document.getElementById('authen1Form');if(!form)return null;
      try{const action=new URL(form.action,location.href);if(action.origin!==location.origin||action.username||action.password||action.pathname!=='/idp/AuthnEngine'||form.method.toLowerCase()!=='post')return null;}catch(_){return null;}
      const user=form.querySelector('input[name="j_username"]'),pass=form.querySelector('input[name="j_password"]'),button=form.querySelector('#loginButton');
      return visible(user)&&visible(pass)&&pass.type==='password'&&visible(button)?{form,user,pass,button}:null;
    }
    const challenge=()=>[...document.querySelectorAll('input[autocomplete="one-time-code"],#j_checkcode,input[placeholder*="验证码"],iframe[src*="captcha"]')].some(visible);
    const errors=()=>[...document.querySelectorAll('.input-error-tip,.errorTip,.errorMsg,#errorMsg,#errorDivMsg,#infoDivMsg,[role="alert"]')].some(el=>visible(el)&&el.textContent.trim());
    try{
      if(!credentials){
        if(window.__tjmuseLoginProbe===nonce)return;window.__tjmuseLoginProbe=nonce;let reported=false,failed=false;
        const inspect=()=>{const value=fields();if(value&&!reported){reported=true;send('form-ready');}if(window.__tjmuseLoginSubmitted&&!failed&&(challenge()||errors())){failed=true;send('needs-user');}};
        if(window.__tjmuseLoginObserver)window.__tjmuseLoginObserver.disconnect();const observer=new MutationObserver(inspect);window.__tjmuseLoginObserver=observer;observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});inspect();setTimeout(()=>observer.disconnect(),120000);return;
      }
      if(window.__tjmuseLoginAttempted)return;window.__tjmuseLoginAttempted=true;const value=fields();
      if(!value||!/^\\d{6,20}$/.test(credentials.studentId)||!credentials.password||(value.pass.maxLength>0&&credentials.password.length>value.pass.maxLength)){send('needs-user');return;}
      const set=(input,text)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
      set(value.user,credentials.studentId);set(value.pass,credentials.password);
      // IAM's blur handler checks captcha requirements before its own login handler.
      value.user.dispatchEvent(new FocusEvent('blur',{bubbles:false}));
      await new Promise(resolve=>setTimeout(resolve,500));const current=fields();
      if(!current||current.form!==value.form||current.user.value!==credentials.studentId||current.pass.value!==credentials.password||challenge()||errors()||current.button.disabled){send('needs-user');return;}
      window.__tjmuseLoginSubmitted=true;send('submitting');current.button.click();
    }catch(_){send('needs-user');}
  })();true;`;
}
