import React,{createContext,useContext} from 'react';
import Animated,{useAnimatedStyle,useReducedMotion,useSharedValue,type SharedValue} from 'react-native-reanimated';
import useSheetKeyboard from './useSheetKeyboard';
const Context=createContext<SharedValue<Record<string,number>>|null>(null);
const KeyboardContext=createContext<SharedValue<number>|null>(null);
export function SheetMotionProvider({children}:{children:React.ReactNode}){
  const progress=useSharedValue<Record<string,number>>({}),keyboard=useSheetKeyboard();
  return <KeyboardContext.Provider value={keyboard}><Context.Provider value={progress}>{children}</Context.Provider></KeyboardContext.Provider>;
}
export function useSheetProgress(){return useContext(Context);}
export function useSheetKeyboardHeight(){return useContext(KeyboardContext);}
export function SheetScene({children,scaleEnabled=true}:{children:React.ReactNode;scaleEnabled?:boolean}){
  const progress=useSheetProgress(),reduce=useReducedMotion();
  const style=useAnimatedStyle(()=>{const value=reduce||!scaleEnabled?0:Math.max(0,...Object.values(progress?.value??{}));return {transform:[{scale:1-value*.025}],borderRadius:value*28};});
  return <Animated.View testID="sheet-scene" style={[{flex:1,overflow:'hidden'},style]}>{children}</Animated.View>;
}
