// AES/ECB/PKCS7 is the protocol required by the official Haoke account service.
// AES implementation: aes-js 3.1.2, MIT (see src/vendor/aes-js.LICENSE.txt).
import aes from '../vendor/aes-js';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decode(text:string){
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new Error('好课加密参数无效');
 const bytes:number[]=[];let value=0,bits=0;
 for(const char of text.replace(/=+$/,'')){value=(value<<6)|alphabet.indexOf(char);bits+=6;if(bits>=8){bits-=8;bytes.push(value>>bits&255);}}
 return new Uint8Array(bytes);
}
function encode(bytes:Uint8Array){let out='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]!<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=alphabet[n>>>18&63]!+alphabet[n>>>12&63]!+(i+1<bytes.length?alphabet[n>>>6&63]:'=')+(i+2<bytes.length?alphabet[n&63]:'=');}return out;}
export function encryptHaokePassword(password:string,key:string){
 const bytes=decode(key.split(',')[0]!);if(![16,24,32].includes(bytes.length))throw new Error('好课加密参数无效');
 return encode(new aes.ModeOfOperation.ecb(bytes).encrypt(aes.padding.pkcs7.pad(aes.utils.utf8.toBytes(password))));
}
