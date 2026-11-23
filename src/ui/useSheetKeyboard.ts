import {useEffect} from 'react';
import {Platform} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';
export default function useSheetKeyboard(){
  const height=useSharedValue(0);
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof window==='undefined'||!window.visualViewport)return;
    const viewport=window.visualViewport;
    const update=()=>{height.value=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop);};
    update();viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);
    return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);};
  },[height]);
  return height;
}
