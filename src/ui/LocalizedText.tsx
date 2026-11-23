import React,{forwardRef} from 'react';
import {Text as NativeText} from 'react-native';
import {useLanguage} from './LocaleContext';
import {tr} from '../core/i18n';
export default forwardRef<React.ComponentRef<typeof NativeText>,React.ComponentProps<typeof NativeText>&{translate?:boolean}>(function LocalizedText({children,translate=true,...props},ref){
 const language=useLanguage();
 return <NativeText {...props} ref={ref}>{translate?React.Children.map(children,c=>typeof c==='string'?tr(c,language):c):children}</NativeText>;
});
