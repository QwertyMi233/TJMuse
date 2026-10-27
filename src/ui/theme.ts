import { useStore } from '../state/store';
export function isDark(hex: string) {
  const c = hex.replace('#', '');
  return parseInt(c.slice(0, 2), 16) * .299 + parseInt(c.slice(2, 4), 16) * .587 + parseInt(c.slice(4, 6), 16) * .114 < 135;
}
export function useTheme() {
  const { data } = useStore();
  const s = data.settings, dark = isDark(s.background);
  return { bg: s.background, fg: s.foreground, accent: s.accent, dark,
    muted: dark ? '#A5B2A9' : '#7C847E', surface: dark ? '#232C26' : '#FFFFFF',
    line: dark ? '#354039' : '#E3E8E1', soft: dark ? '#2C3E32' : '#E9EFE6',
    onAccent: isDark(s.accent) ? '#FFFFFF' : '#17231B',
  };
}
