import React,{forwardRef} from 'react';
import {TextInput} from 'react-native';
import {useT} from './LocaleContext';
export default forwardRef<React.ComponentRef<typeof TextInput>,React.ComponentProps<typeof TextInput>>(function LocalizedTextInput(props,ref){
 const t=useT();return <TextInput {...props} ref={ref} placeholder={props.placeholder?t(props.placeholder):undefined} accessibilityLabel={props.accessibilityLabel?t(props.accessibilityLabel):undefined}/>;
});
