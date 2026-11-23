import type { Palette, Settings } from './types';
export const LIGHT_PALETTE: Palette = { foreground: '#123B64', background: '#FFFFFF', accent: '#0066B3' };
export const DARK_PALETTE: Palette = { foreground: '#F2F6FC', background: '#111D2D', accent: '#0066B3' };
export const validHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export function isDark(hex: string) {
  const c = hex.slice(1);
  return parseInt(c.slice(0, 2), 16) * .299 + parseInt(c.slice(2, 4), 16) * .587 + parseInt(c.slice(4, 6), 16) * .114 < 135;
}
export function resolveTheme(settings: Pick<Settings, 'themeMode' | 'themePalettes'>, system: string | null | undefined) {
  const mode = settings.themeMode === 'system' ? system === 'dark' ? 'dark' : 'light' : settings.themeMode;
  return { ...settings.themePalettes[mode], mode, dark: mode === 'dark' };
}
