import {useEffect} from 'react';
import {Dimensions,Keyboard} from 'react-native';
import {cancelAnimation,Easing,useSharedValue,withTiming} from 'react-native-reanimated';
import {recordKeyboard} from '../core/diagnostics';
// UIKit's public keyboard frame includes the password/previous-next accessory.
// Reading a private keyboard view's height can miss that region in a WebView.
export default function useSheetKeyboard(){
  const height=useSharedValue(0);
  useEffect(()=>{
    const change=Keyboard.addListener('keyboardWillChangeFrame',event=>{
      recordKeyboard(true,event.endCoordinates.screenY,event.endCoordinates.height);
      const full=Dimensions.get('screen').height;
      const next=Math.max(0,Math.min(full,full-event.endCoordinates.screenY));
      const duration=Math.max(0,event.duration||0);
      cancelAnimation(height);
      height.value=duration?withTiming(next,{duration,easing:Easing.bezier(.25,.1,.25,1)}):next;
    });
    const hide=Keyboard.addListener('keyboardDidHide',()=>{cancelAnimation(height);height.value=0;});
    return()=>{change.remove();hide.remove();cancelAnimation(height);};
  },[height]);
  return height;
}
