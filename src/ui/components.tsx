import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {ActivityIndicator,Keyboard,Platform,Pressable,ScrollView,StyleSheet,View,type TextInputProps,type ViewStyle} from 'react-native';
import Text from './LocalizedText';
import TextInput from './LocalizedTextInput';

import Ionicons from '@expo/vector-icons/Ionicons';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from './theme';
import CloseButton from './CloseButton';
import SheetFrame from './SheetFrame';
import {sheetContentHeight} from './sheet-layout';
import useSheetWindowDimensions from './useSheetWindowDimensions';
import {useT} from './LocaleContext';
import {containsSheetInput,sheetPresentation} from './sheet-presentation';
import {recordSheetLayout} from '../core/diagnostics';
import {SheetExit} from './sheet-exit';
import type {SheetDismiss} from './useSheetDismiss';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
type SheetInput=React.ComponentRef<typeof TextInput>;
const SheetInputContext=createContext<{focus:(input:SheetInput|null)=>void;blur:(input:SheetInput|null)=>void}|null>(null);
const SheetDismissContext=createContext<SheetDismiss|null>(null);
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const t = useTheme(); return <Ionicons name={name} size={size} color={color || t.fg} style={t.dark&&(color||t.fg)===t.accent?{textShadowColor:t.accent+'88',textShadowRadius:8,textShadowOffset:{width:0,height:0}}:undefined} />;
}
export function Tap({ children, onPress, label, style, disabled = false,dismiss=false }: { children: React.ReactNode; onPress: () => void; label: string; style?: ViewStyle | ViewStyle[]; disabled?: boolean;dismiss?:boolean }) {
  const txt=useT(),close=useContext(SheetDismissContext);return <Pressable accessibilityRole="button" accessibilityLabel={txt(label)} disabled={disabled} onPress={()=>dismiss&&close?close(onPress):onPress()} style={({ pressed }) => [style, { opacity: disabled ? .4 : pressed ? .65 : 1 }]}>{children}</Pressable>;
}
export function IconButton({ icon, onPress, label, color, style,dismiss=false }: { icon: IconName; onPress: () => void; label: string; color?: string; style?: ViewStyle;dismiss?:boolean }) {
  return <Tap dismiss={dismiss} label={label} onPress={onPress} style={[styles.iconButton, style || {}]}><Icon name={icon} color={color} size={21} /></Tap>;
}
export function Button({ title, onPress, icon, secondary, busy, disabled,dismiss=false }: { title: string; onPress: () => void; icon?: IconName; secondary?: boolean; busy?: boolean; disabled?: boolean;dismiss?:boolean }) {
  const t = useTheme(); return <Tap dismiss={dismiss} label={title} onPress={onPress} disabled={busy || disabled} style={[styles.button, { backgroundColor: secondary ? t.soft : t.accent,boxShadow:t.dark&&!secondary?t.glow:'none' }]}>
    {busy ? <ActivityIndicator color={secondary ? t.accent : t.onAccent} /> : icon ? <Icon name={icon} size={19} color={secondary ? t.accent : t.onAccent} /> : null}
    <Text style={{ flexShrink:1,textAlign:'center',fontSize: 15, fontWeight: '600', color: secondary ? t.accent : t.onAccent }}>{title}</Text>
  </Tap>;
}
export function Checkbox({ checked, onPress, label, color }: { checked: boolean; onPress: () => void; label: string; color?: string }) {
  const t = useTheme(); return <Tap label={label} onPress={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); onPress(); }} style={{ padding: 8, marginLeft: -4 }}>
    <View accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ width: 23, height: 23, borderRadius: 8, borderWidth: 1.5, borderColor: checked ? t.accent : color || t.line, backgroundColor: checked ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center',boxShadow:t.dark&&checked?t.glow:'none' }}>
      {checked && <Icon name="checkmark" color={t.onAccent} size={16} />}
    </View>
  </Tap>;
}
export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const t = useTheme(),sheet=useContext(SheetInputContext),input=useRef<SheetInput>(null); return <View style={{ gap: 8 }}>
    {label && <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', marginLeft: 2 }}>{label}</Text>}
    <TextInput accessibilityLabel={label || props.placeholder} placeholderTextColor={t.muted} {...props} ref={input} onFocus={event=>{sheet?.focus(input.current);props.onFocus?.(event);}} onBlur={event=>{sheet?.blur(input.current);props.onBlur?.(event);}} style={[styles.field, { backgroundColor: t.surface, color: t.fg, borderColor: t.line }, props.multiline && { minHeight: 88, textAlignVertical: 'top' }, style]} />
  </View>;
}
export function Pill({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  const t = useTheme(); return <Tap onPress={onPress} label={title} style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16, backgroundColor: selected ? t.accent : t.surface, borderWidth: 1, borderColor: selected ? t.accent : t.line,boxShadow:t.dark&&selected?t.glow:'none' }}>
    <Text style={{ color: selected ? t.onAccent : t.muted, fontSize: 13, fontWeight: '600' }}>{title}</Text>
  </Tap>;
}
interface SheetProps { visible:boolean;title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;footer?:React.ReactNode;size?:'content'|'large';keyboardInput?:boolean;headerAction?:React.ReactNode|((close:()=>void)=>React.ReactNode);closeRef?:React.RefObject<SheetDismiss|null> }
export function Sheet(props:SheetProps){return props.visible?<MeasuredSheet {...props}/>:null;}
function SheetExitBinding({close,exit,closeRef,children}:{close:()=>void;exit:SheetExit;closeRef?:React.RefObject<SheetDismiss|null>;children:(dismiss:SheetDismiss)=>React.ReactNode}){
  const dismiss=useCallback<SheetDismiss>(after=>exit.request(close,after),[exit,close]);
  useLayoutEffect(()=>{if(closeRef)closeRef.current=dismiss;return()=>{if(closeRef?.current===dismiss)closeRef.current=null;};},[closeRef,dismiss]);
  return <SheetDismissContext.Provider value={dismiss}>{children(dismiss)}</SheetDismissContext.Provider>;
}
function MeasuredSheet({ visible, title, subtitle, onClose, children, footer, size='content',keyboardInput=false,headerAction,closeRef }:SheetProps) {
  const [exit]=useState(()=>new SheetExit());
  const t = useTheme(), insets = useSafeAreaInsets(), screen = useSheetWindowDimensions();
  const bottomInset=Math.max(insets.bottom,initialWindowMetrics?.insets.bottom??0);
  const [keyboardShown,setKeyboardShown]=useState(Keyboard.isVisible());
  useEffect(()=>{const a=Keyboard.addListener('keyboardWillShow',()=>setKeyboardShown(true)),b=Keyboard.addListener('keyboardDidHide',()=>setKeyboardShown(false));return()=>{a.remove();b.remove();};},[]);
  const [measured, setMeasured] = useState({ header: 0, body: 0, footer: 0 });
  const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const focused=useRef<SheetInput|null>(null),offset=useRef(0);
  const reveal=useCallback(()=>{
    const input=focused.current;if(!input||!scroll.current)return;
    input.measureInWindow((_x,y,_w,h)=>scroll.current?.measureInWindow((_sx,sy,_sw,sh)=>{
      const delta=y+h+16-sy-sh;
      if(focused.current===input&&delta>1)scroll.current?.scrollTo({y:Math.max(0,offset.current+delta),animated:true});
    }));
  },[]);
  const measure = (key: keyof typeof measured, value: number) => setMeasured(old => key==='footer'&&keyboardShown&&old.footer>0||Math.abs(old[key] - value) < 1 ? old : { ...old, [key]: Math.ceil(value) });
  const cap = Math.max(120, Math.min(screen.height * .92, screen.height - Math.max(insets.top, 12)));
  const layout=sheetContentHeight(measured.header,measured.body,footer?measured.footer:0,cap,size==='large');
  // Large forms already have a known detent. Mount their inputs once, inside
  // the presenter, rather than pre-mounting them invisibly for measurement.
  const ready=size==='large'||layout.ready&&(!footer||measured.footer>0);
  // A title/content change must not replace an active native controller.
  const [presentation]=useState(()=>sheetPresentation(Platform.OS,size,containsSheetInput(children,new Set([Field,TextInput])),keyboardInput)),nativeForm=presentation==='form';
  // Content panels own one device inset; native forms let SwiftUI own it.
  // A short menu must not reserve a full form viewport beneath its content.
  const footerBottom=nativeForm||keyboardShown?8:Math.max(12,bottomInset+8);
  const bodyBottom=footer?16:nativeForm||keyboardShown?12:Math.max(12,bottomInset+8);
  const lastViewport=useRef(0);
  useEffect(()=>{recordSheetLayout(presentation,layout.height,lastViewport.current,measured.body,measured.footer);},[presentation,layout.height,measured.body,measured.footer]);
  useEffect(()=>{
    if(!visible)return;
    let pending:ReturnType<typeof setTimeout>|undefined;
    const schedule=(delay=100)=>{clearTimeout(pending);pending=setTimeout(reveal,delay);};
    if(Platform.OS==='web'){
      const viewport=typeof window!=='undefined'?window.visualViewport:null;
      const update=()=>schedule();viewport?.addEventListener('resize',update);
      return()=>{clearTimeout(pending);viewport?.removeEventListener('resize',update);};
    }
    const show=Keyboard.addListener('keyboardDidShow',()=>schedule(16));
    const change=Keyboard.addListener('keyboardWillChangeFrame',event=>schedule(Math.max(16,event.duration||0)+16));
    return()=>{clearTimeout(pending);show.remove();change.remove();};
  },[visible,reveal]);
  const inputs={focus:(input:SheetInput|null)=>{focused.current=input;requestAnimationFrame(reveal);},blur:(input:SheetInput|null)=>{if(focused.current===input)focused.current=null;}};
  return <SheetFrame presentation={presentation} visible={visible} ready={ready} height={layout.height} cap={cap} backgroundColor={t.bg} dark={t.dark} onClose={()=>exit.complete(onClose)} onViewport={height=>{lastViewport.current=height;recordSheetLayout(presentation,layout.height,height,measured.body,measured.footer);}}>{(header,close)=><SheetExitBinding exit={exit} close={close} closeRef={closeRef}>{dismiss=><SheetInputContext.Provider value={inputs}><View testID="sheet-card" accessibilityViewIsModal style={{ flex:1, backgroundColor: t.bg, opacity: ready ? 1 : 0 }}>
          {header(<View testID="sheet-drag-handle" onLayout={event => measure('header', event.nativeEvent.layout.height)} style={{paddingTop:10}}>
            <View style={{alignSelf:'center',width:36,height:5,borderRadius:3,backgroundColor:t.line,marginBottom:4}}/>
            <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 26, fontWeight: '700', color: t.fg, letterSpacing: -.8 }}>{title}</Text>{subtitle && <Text style={{ color: t.muted, fontSize: 12 }}>{subtitle}</Text>}</View>
            {typeof headerAction==='function'?headerAction(()=>dismiss()):headerAction}<CloseButton onPress={()=>dismiss()} /></View>
          </View>)}
          <ScrollView ref={scroll} testID="sheet-scroll" style={{ flex: 1 }} onLayout={()=>{if(focused.current)requestAnimationFrame(reveal);}} onScroll={event=>{offset.current=event.nativeEvent.contentOffset.y;}} scrollEventThrottle={32} automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never" removeClippedSubviews={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View testID="sheet-content" collapsable={false} onLayout={event=>measure('body',event.nativeEvent.layout.height)} style={{paddingHorizontal:24,paddingBottom:bodyBottom,gap:20}}>{children}</View></ScrollView>
          {footer && <View testID="sheet-footer" onLayout={event => measure('footer', event.nativeEvent.layout.height)} style={{ paddingHorizontal:20,paddingTop:12,paddingBottom:footerBottom,flexShrink:0, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.bg }}>{footer}</View>}
        </View></SheetInputContext.Provider>}</SheetExitBinding>}</SheetFrame>;
}
export function Fab({ onPress, label = '添加 To-do', small = false }: { onPress: () => void; label?: string; small?: boolean }) {
  const t = useTheme(); return <Tap onPress={onPress} label={label} style={{ width: small ? 42 : 58, height: small ? 42 : 58, borderRadius: Platform.OS === 'android' ? 20 : 30, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderWidth: 1, borderColor: '#FFFFFF33', boxShadow: t.dark ? `0px 0px 24px ${t.accent}88` : '0px 6px 18px #123B642B' }}><Icon name="add" size={small ? 24 : 31} color={t.onAccent} /></Tap>;
}
export function Hint({ children, error = false,center=false }: { children: React.ReactNode; error?: boolean;center?:boolean }) {
  const t = useTheme(); return <Text accessibilityRole={error ? 'alert' : undefined} style={{ textAlign:center?'center':undefined,color: error ? '#BE524F' : t.muted, fontSize: 12, lineHeight: 20 }}>{children}</Text>;
}
export function ConfirmSheet({ visible, title, description, onClose, onConfirm }: { visible: boolean; title: string; description: string; onClose: () => void; onConfirm: () => void }) {
  return <Sheet visible={visible} title={title} onClose={onClose} footer={<Button dismiss title="确认" onPress={() => { onConfirm(); onClose(); }} />}><Hint>{description}</Hint></Sheet>;
}
const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 50, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  field: { minHeight: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, lineHeight: 22 },
});
