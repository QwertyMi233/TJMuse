import data from '../assets/countries.json';
import type {Language} from './locales';
import type {Profile} from './types';
export const COUNTRIES=data;
export function countryName(code:string|undefined,language:Language='zh-CN'){
 const country=COUNTRIES.find(c=>c.code===code);return country?.names[language]||'';
}
export function profileCountry(profile:Pick<Profile,'region'|'regionCode'>,language:Language){
 const direct=countryName(profile.regionCode,language);if(direct)return direct;
 const legacy=typeof profile.region==='string'?profile.region.trim():'';
 const country=COUNTRIES.find(c=>c.code===legacy.toUpperCase()||Object.values(c.names).some(n=>n.toLocaleLowerCase()===legacy.toLocaleLowerCase()));
 if(country)return country.names[language];
 if(['中国','中國','中国大陆','中國大陸','Mainland China'].includes(legacy))return countryName('CN',language);
 return legacy;
}
export function countryRows(language:Language,query=''){
 const filtered=COUNTRIES.filter(c=>`${c.names[language]} ${c.names['en-US']} ${c.code}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>a.names['en-US'].localeCompare(b.names['en-US'],'en-US'));
 let previous='';const rows:({key:string;letter:string;code?:string;title:string;english?:string;offset:number;height:number})[]=[];let offset=0;
 for(const country of filtered){const letter=country.names['en-US'].normalize('NFD').replace(/[\u0300-\u036f]/g,'')[0]!.toUpperCase();if(letter!==previous){rows.push({key:letter,letter,title:letter,offset,height:30});offset+=30;previous=letter;}rows.push({key:country.code,code:country.code,letter,title:country.names[language],english:country.names['en-US'],offset,height:62});offset+=62;}
 return rows;
}
