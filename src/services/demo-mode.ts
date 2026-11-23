import { Platform } from 'react-native';
function enabled() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('demo') === '021') window.sessionStorage.setItem('tjmuse.demo.v021', '1');
  return window.sessionStorage.getItem('tjmuse.demo.v021') === '1';
}
export const DEMO_MODE = enabled();
export const demoDelay = () => new Promise<void>(resolve => setTimeout(resolve, 650));
