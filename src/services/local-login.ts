import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createTongjiLoginVault} from '../core/tongji-login';
import {DEMO_MODE} from './demo-mode';
export function createLocalLoginService(key:string,validate?: (account:string,password:string)=>void){
  let demoRecord:string|null=null;const listeners=new Set<()=>void>();
  const supported=()=>{if(Platform.OS==='web'&&!DEMO_MODE)throw new Error('请在 iOS／Android App 中设置本机自动登录。');};
  const vault=createTongjiLoginVault({
    get:async()=>{supported();return Platform.OS==='web'?demoRecord:SecureStore.getItemAsync(key);},
    set:async value=>{supported();if(Platform.OS==='web')demoRecord=value;else await SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});},
    remove:async()=>{supported();if(Platform.OS==='web')demoRecord=null;else await SecureStore.deleteItemAsync(key);},
  },validate);
  const changed=()=>listeners.forEach(listener=>listener());
  return {matches:vault.matches,status:vault.status,reserve:vault.reserve,succeeded:vault.succeeded,release:vault.release,failed:vault.failed,
    save:async(studentId:string,password:string,consent:boolean)=>{await vault.save(studentId,password,consent);changed();},
    clear:async()=>{await vault.clear();changed();},retry:async()=>{await vault.retry();changed();},
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
  };
}
