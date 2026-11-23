import type { SessionJob } from './web-session';

type NavigationDecision = { action: 'allow' } | { action: 'redirect'; url: string } | { action: 'block'; reason: 'insecure' | 'unsupported' };

export function sessionNavigation(kind: SessionJob['kind'], raw: string): NavigationDecision {
  if (raw === 'about:blank') return { action: 'allow' };
  try {
    const url = new URL(raw);
    if (url.username || url.password) return { action: 'block', reason: 'unsupported' };
    if (url.protocol === 'https:') return { action: 'allow' };
    if (kind === 'timetable' && url.origin === 'http://1.tongji.edu.cn') {
      url.protocol = 'https:';
      return { action: 'redirect', url: url.href };
    }
    return { action: 'block', reason: url.protocol === 'http:' ? 'insecure' : 'unsupported' };
  } catch {
    return { action: 'block', reason: 'unsupported' };
  }
}

export function sessionWebViewNavigation(kind: SessionJob['kind'], redirect: (url: string) => void, blocked: (message: string) => void) {
  return {
    // WebView opens unmatched origins externally BEFORE consulting our callback.
    // Delegate every scheme to the policy below; this is not permission to load it.
    originWhitelist: ['*'],
    javaScriptCanOpenWindowsAutomatically: true,
    setSupportMultipleWindows: false,
    allowsLinkPreview: false,
    // Intentionally leave onOpenWindow unset. On iOS the native delegate then loads
    // the original new-window request in this WebView, preserving POST bodies and cookies.
    onShouldStartLoadWithRequest(request: { url: string }) {
      const decision = sessionNavigation(kind, request.url);
      if (decision.action === 'allow') return true;
      if (decision.action === 'redirect') redirect(decision.url);
      else blocked(decision.reason === 'insecure' ? '已停止加载不安全的网页，请使用学校的 HTTPS 登录页面。' : '此链接需要外部应用，请继续使用下方的网页登录。');
      return false;
    },
  };
}

export function sameFrameNavigationScript(url: string) {
  if (new URL(url).protocol !== 'https:') throw new Error('只能转入 HTTPS 网页。');
  return `window.location.replace(${JSON.stringify(url)});true;`;
}
