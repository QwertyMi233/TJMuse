import catalog from '../assets/translations.json';
import type {Language} from './locales';
let current:Language='zh-CN';
export const setAppLanguage=(language:Language)=>{current=language;};
export const appLanguage=()=>current;
const entries=catalog as Record<string,Partial<Record<Language,string>>>;
const patterns=Object.keys(entries).filter(k=>/\{\d+\}/.test(k)).sort((a,b)=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(key=>({key,regex:new RegExp('^'+key.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?'([\\s\\S]*?)':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$')}));
export function tr(text:string,language=current):string{
 if(language==='zh-CN'||!text)return text;
 const direct=entries[text]?.[language]||entries[text]?.['en-US'];if(direct)return direct;
 const trimmed=text.trim();if(trimmed!==text&&(entries[trimmed]?.[language]||entries[trimmed]?.['en-US']))return text.replace(trimmed,entries[trimmed]![language]||entries[trimmed]!['en-US']!);
 for(const {key,regex} of patterns){const match=text.match(regex);if(match){const value=entries[key]?.[language]||entries[key]?.['en-US'];if(value)return value.replace(/\{(\d+)\}/g,(_s,n)=>{const part=match[Number(n)+1]||'';return entries[part]?.[language]||entries[part]?.['en-US']||part;});}}
 return text;
}
