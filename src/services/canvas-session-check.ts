// A read-only request refreshes the existing Cookie-backed session. It does not
// export cookies, read assignments, or regenerate any access token.
export function canvasSessionCheckScript(nonce: string, accountId: string) {
  return `(async function(){
    const ORIGIN='https://canvas.tongji.edu.cn',accountId=${JSON.stringify(accountId)};
    const send=result=>window.ReactNativeWebView.postMessage(JSON.stringify({nonce:${JSON.stringify(nonce)},kind:'done',result}));
    const fail=code=>{throw {code};};
    try {
      if(location.origin!==ORIGIN)fail('login_required');
      if(!/^\\d+$/.test(accountId))fail('invalid_identity');
      let response;
      try{response=await fetch(ORIGIN+'/api/v1/users/self/profile',{credentials:'same-origin',redirect:'error',headers:{Accept:'application/json'}});}
      catch(_){fail('network_or_session_redirect');}
      if(response.status===401)fail('login_required');
      if(!response.ok)fail('http_'+response.status);
      let profile;
      try{profile=await response.json();}catch(_){fail('login_or_non_json_response');}
      if(String(profile&&profile.id)!==accountId)fail('account_changed');
      send({status:'ok',accountId});
    }catch(error){send({status:error.code||'web_setup_failed'});}
  })();true;`;
}
