import {Platform,useWindowDimensions} from 'react-native';
export default function useSheetWindowDimensions(){
  const dimensions=useWindowDimensions();
  // RN Web reports the visual viewport (which shrinks with the IME). The
  // sheet measures the layout viewport and accounts for the IME exactly once.
  if(Platform.OS==='web'&&typeof window!=='undefined')return {...dimensions,width:window.innerWidth,height:window.innerHeight};
  return dimensions;
}
