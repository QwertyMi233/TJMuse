import React from 'react';
import AttachedSheetFrame from './AttachedSheetFrame';
import NativeInputSheet from './NativeInputSheet.ios';
import type {SheetFrameProps} from './sheet-types';
// Read-only menus use their measured content height, edge-attached. Keep the
// native keyboard-aware presenter for forms rather than floating every menu.
export default function SheetFrame(props:SheetFrameProps){
 return props.presentation==='form'?<NativeInputSheet {...props}/>:<AttachedSheetFrame {...props}/>;
}
