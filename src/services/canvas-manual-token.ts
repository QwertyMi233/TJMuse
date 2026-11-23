export function canvasManualTokenScript(nonce:string,origin:string,read=false){return String.raw`(function(){
 if(location.origin!==${JSON.stringify(origin)}||window.top!==window.self||location.pathname!=='/profile/settings')return;
 const valid=value=>typeof value==='string'&&/^[A-Za-z0-9._~-]{30,4096}$/.test(value)&&!value.includes('...');
 const remember=data=>{const token=data?.access_token?.visible_token||data?.access_token?.token||data?.visible_token||data?.token;if(valid(token))window.__tjmuseNewCanvasToken=token;};
 if(window.__tjmuseCanvasTokenCapture!==${JSON.stringify(nonce)}){
  window.__tjmuseCanvasTokenCapture=${JSON.stringify(nonce)};
  const endpoint=raw=>{try{const url=new URL(raw,location.href);return url.origin===location.origin&&/^\/profile\/tokens(?:\/\d+)?$/.test(url.pathname);}catch{return false;}};
  const original=window.fetch;window.fetch=function(...args){const result=original.apply(this,args);if(endpoint(typeof args[0]==='string'?args[0]:args[0]?.url))result.then(r=>r.clone().json()).then(remember).catch(()=>{});return result;};
  const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(method,url,...rest){this.__tjmuseTokenEndpoint=endpoint(url);return open.call(this,method,url,...rest);};
  XMLHttpRequest.prototype.send=function(...args){if(this.__tjmuseTokenEndpoint)this.addEventListener('load',()=>{try{remember(JSON.parse(this.responseText));}catch{}});return send.apply(this,args);};
 }
 if(!${JSON.stringify(read)})return;
 let token=window.__tjmuseNewCanvasToken;
 if(!valid(token))for(const el of document.querySelectorAll('#access_token_token,.visible_token,.token_value,[data-testid="access-token"],input[name="access_token[token]"]')){const value=(el.value||el.textContent||'').trim();if(valid(value)){token=value;break;}}
 window.ReactNativeWebView.postMessage(JSON.stringify({nonce:${JSON.stringify(nonce)},kind:'canvas-manual-token',...(valid(token)?{token}:{error:'visible_token_missing'})}));
})();true;`;}
