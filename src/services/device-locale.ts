import {getLocales} from 'expo-localization';
export function deviceLocale(){
 try{const locale=getLocales()[0],language=locale?.languageTag||'en-US';return {language,region:locale?.regionCode||new Intl.Locale(language).maximize().region||'CN'};}catch{return {language:'en-US',region:'CN'};}
}
