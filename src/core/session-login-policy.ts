import type {TongjiLoginStatus} from './tongji-login';
// Saving a login enables both background recovery and an explicitly opened
// official page. Manual presentation must not silently turn autofill off.
export function canUseSavedPlatformLogin(kind:string,status:TongjiLoginStatus){
 return kind!=='canvas-browser'&&status.enabled&&status.state==='ready';
}
