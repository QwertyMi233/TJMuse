import React from 'react';
import {StyleSheet,View} from 'react-native';
// Keep the native WebView attached, with real bounds and nonzero opacity.
// AppShell renders this surface behind its opaque app content instead of hiding
// it with alpha=0, which can suspend WebKit's rendering and DOM readiness checks.
export default function BackgroundWebSession({children}:{children:React.ReactNode}){
 return <View testID="background-web-session" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{children}</View>;
}
