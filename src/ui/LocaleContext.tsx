import React,{createContext,useContext,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {useStore} from '../state/store';
import {resolveLanguage,type Language} from '../core/locales';
import {deviceLocale} from '../services/device-locale';
import {setAppLanguage,tr} from '../core/i18n';
const Context=createContext<Language>('zh-CN');
export function LocaleProvider({children}:{children:React.ReactNode}){
 const {data}=useStore(),[system,setSystem]=useState(()=>deviceLocale().language);
 useEffect(()=>{const s=AppState.addEventListener('change',state=>{if(state==='active')setSystem(deviceLocale().language);});return()=>s.remove();},[]);
 const language=resolveLanguage(data.settings.language,system);setAppLanguage(language);
 return <Context.Provider value={language}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
export function useT(){const language=useLanguage();return (text:string)=>tr(text,language);}
