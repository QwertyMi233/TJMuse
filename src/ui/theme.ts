import { useStore } from '../state/store';
import {createContext,useContext} from 'react';
import type {Palette} from '../core/types';
import { useColorScheme } from 'react-native';
import { isDark, resolveTheme } from '../core/theme';
export { isDark } from '../core/theme';
const Override=createContext<Palette|null>(null);
export const ThemeOverrideProvider=Override.Provider;
export function useTheme() {
  const { data } = useStore(), system = useColorScheme(),override=useContext(Override);
  const s = override?{...override,mode:'light' as const,dark:false}:resolveTheme(data.settings, system), dark = s.dark;
  return { bg: s.background, fg: s.foreground, accent: s.accent, dark, mode: s.mode,
    glow: dark ? `0px 0px 18px ${s.accent}55` : '0px 2px 5px #123B6405',
    muted: dark ? '#AFBED1' : '#64778D', surface: dark ? '#1B2A3E' : '#FFFFFF',
    line: dark ? '#33475F' : '#DEE8F2', soft: dark ? '#233C58' : '#EAF3FC',
    onAccent: isDark(s.accent) ? '#FFFFFF' : '#123B64',
  };
}
