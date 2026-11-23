export function isExpiredPlatformSession(status:number,code:unknown,message:unknown){
  if([401,403].includes(status)||[401,403].includes(Number(code)))return true;
  const text=typeof message==='string'?message:'';
  return /(?:token|令牌|会话).*(?:无效|失效|过期|expired|invalid)|(?:未登录|未登陆|请重新登[录陆]|登录已失效|登录(?:已)?过期|认证失败)/i.test(text);
}
export function transientWebNavigationError(code:number){return code===-999||code===102;}
