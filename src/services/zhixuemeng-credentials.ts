import {createLocalLoginService} from './local-login';
export function validateZhixuemengAccount(account:string,password:string){
 if(!account.trim()||account.length>128||/[\u0000\r\n]/.test(account))throw new Error('请输入有效的智学盟账号。');
 if(!password||password.length>128||/[\u0000\r\n]/.test(password))throw new Error('请输入有效的智学盟密码。');
}
export const zhixuemengLogin=createLocalLoginService('tjmuse.zhixuemeng.login.v1',validateZhixuemengAccount);
