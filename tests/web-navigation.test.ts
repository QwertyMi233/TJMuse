import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { sameFrameNavigationScript, sessionNavigation, sessionWebViewNavigation } from '../src/services/web-navigation';

// Exercise the installed package's real whitelist/delegate ordering, not a copy
// of it: this is the path that previously opened the system browser on iOS.
function installedWebViewDelegate() {
  const opened: string[] = [], decisions: boolean[] = [];
  const native = { Linking: { canOpenURL: async () => true, openURL: async (url: string) => { opened.push(url); } } };
  const source = fs.readFileSync('node_modules/react-native-webview/src/WebViewShared.tsx', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports: Record<string, any> = {};
  vm.runInNewContext(compiled, { exports, console, require: (name: string) => {
    if (name === 'react-native') return native;
    if (name === 'escape-string-regexp') return (value: string) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
    if (name === 'react' || name === './WebView.styles') return {};
    throw new Error(`Unexpected WebView dependency ${name}`);
  } });
  return { opened, decisions, delegate: (whitelist: string[], callback: (request: {url: string}) => boolean) => exports.createOnShouldStartLoadWithRequest((allow: boolean) => decisions.push(allow), whitelist, callback) };
}
const request = (url: string, fields = {}) => ({ nativeEvent: { url, lockIdentifier: 1, isTopFrame: true, navigationType: 'other', ...fields } });

test('installed WebView externalizes HTTP before the old callback; new policy upgrades it inside the same session', async () => {
  const original = 'http://1.tongji.edu.cn/GraduateStudentTimeTable?ticket=TEST%2BONLY&service=https%3A%2F%2F1.tongji.edu.cn%2F';
  const old = installedWebViewDelegate(); let oldCallbackCalled = false;
  old.delegate(['https://*'], () => { oldCallbackCalled = true; return false; })(request(original));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(oldCallbackCalled, false); assert.deepEqual(old.opened, [original]);

  const fixed = installedWebViewDelegate(), redirects: string[] = [], messages: string[] = [];
  const config = sessionWebViewNavigation('timetable', url => redirects.push(url), message => messages.push(message));
  fixed.delegate(config.originWhitelist, config.onShouldStartLoadWithRequest)(request(original));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixed.opened, []); assert.deepEqual(fixed.decisions, [false]); assert.deepEqual(messages, []);
  assert.deepEqual(redirects, [original.replace('http:', 'https:')]);
  let next = '';
  vm.runInNewContext(sameFrameNavigationScript(redirects[0]!), { window: { location: { replace: (url: string) => { next = url; } } } });
  assert.equal(next, redirects[0]);
});

test('HTTPS SSO forms and callbacks continue as native requests without rebuilding their POST data', async () => {
  for (const kind of ['timetable','haoke-login','canvas-list','canvas-rotate','canvas-keepalive'] as const) {
    const actual = installedWebViewDelegate(), redirected: string[] = [];
    const config = sessionWebViewNavigation(kind, url => redirected.push(url), () => assert.fail('HTTPS login must not be blocked'));
    const decide = actual.delegate(config.originWhitelist, config.onShouldStartLoadWithRequest);
    for (const url of ['https://iam.tongji.edu.cn/idp/authcenter/ActionAuthChain?service=http%3A%2F%2F1.tongji.edu.cn%2F', 'https://1.tongji.edu.cn/GraduateStudentTimeTable?ticket=TEST', 'https://canvas.tongji.edu.cn/profile/settings']) decide(request(url, { method: 'POST', body: 'SAMLResponse=TEST%2BONLY' }));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(actual.decisions, [true,true,true]); assert.deepEqual(actual.opened, []); assert.deepEqual(redirected, []);
    assert.equal(config.javaScriptCanOpenWindowsAutomatically, true); assert.equal(config.setSupportMultipleWindows, false); assert.equal('onOpenWindow' in config, false);
  }
});

test('unhandled schemes and unrelated HTTP links are stopped without opening an external app', async () => {
  const actual = installedWebViewDelegate(), messages: string[] = [], redirects: string[] = [];
  const config = sessionWebViewNavigation('timetable', url => redirects.push(url), message => messages.push(message));
  const decide = actual.delegate(config.originWhitelist, config.onShouldStartLoadWithRequest);
  const urls = ['http://example.test/login', 'http://1.tongji.edu.cn.example.test/', 'http://1.tongji.edu.cn:8080/', 'file:///tmp/example', 'javascript:alert(1)', 'intent://login', 'tongji://login', 'https://user:password@1.tongji.edu.cn/', 'not a URL'];
  for (const url of urls) decide(request(url));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(actual.opened, []); assert.deepEqual(redirects, []); assert.equal(messages.length, urls.length); assert.equal(actual.decisions.every(value => !value), true);
  assert.deepEqual(sessionNavigation('timetable','about:blank'), {action:'allow'});
  assert.equal(sessionNavigation('canvas-list','http://1.tongji.edu.cn/').action, 'block');
});

test('same-frame navigation preserves encoded callbacks without evaluating their text', () => {
  const url = 'https://1.tongji.edu.cn/?ticket=TEST%2F%2B%3D&next=%22%3Balert(1)%3B%2F%2F';
  const replaced: string[] = [];
  vm.runInNewContext(sameFrameNavigationScript(url), { window: { location: { replace: (value: string) => replaced.push(value) } } });
  assert.deepEqual(replaced, [url]); assert.throws(() => sameFrameNavigationScript('http://1.tongji.edu.cn/'));
});
