// Adapted from TJ-Class-Schedule, MIT, Copyright (c) 2026 Algernon.
// Source: packages/canvas_session_bridge/android/src/main/assets/canvas_rotation.js
// Complete license in THIRD_PARTY_NOTICES.md. React Native bridge; pending recovery avoids re-rotation.
export const CANVAS_ROTATION_SCRIPT = String.raw`/* 学校 profile-c-4197f3cee2.js 已核对：PUT + access_token[regenerate]=1。 */
(function (root) {
  'use strict';
  const ORIGIN = 'https://canvas.tongji.edu.cn';
  const fail = code => { const error = new Error(code); error.code = code; throw error; };
  const identity = value => /^\d+$/.test(String(value)) ? String(value) : fail('invalid_identity');
  const tokenText = value => typeof value === 'string' && /^[A-Za-z0-9._~-]{30,2048}$/.test(value) && !value.endsWith('...');
  const unwrap = value => value?.access_token && typeof value.access_token === 'object' ? value.access_token : value;
  const scopes = value => JSON.stringify([...(value || [])].sort());
  // 学校页面的日期库将 Date.parse 改为返回 Date/null，还不能解析毫秒。
  // 构造器仍使用浏览器原生 ISO 解析；仅服务端 null/缺省表示无期限。
  const expiryTime = value => value == null ? null :
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? new Date(value).getTime() : NaN;
  async function run(io, config) {
    if (io.origin !== ORIGIN) fail('login_required');
    const tokenId = identity(config.tokenId);
    if (!config.purpose || typeof config.purpose !== 'string') fail('invalid_purpose');
    const path = '/profile/tokens/' + tokenId;
    async function request(path, options = {}) {
      const url = new URL(path, ORIGIN);
      if (url.origin !== ORIGIN || !/^\/(api\/v1\/|profile\/tokens\/\d+$)/.test(url.pathname)) fail('unsafe_endpoint');
      let response;
      try { response = await io.fetch(url.href, {credentials: 'same-origin', redirect: 'error', ...options}); }
      catch (_) { fail('network_or_session_redirect'); }
      if (!response.ok) {
        if (response.status === 401) {
          if (options.credentials !== 'omit') fail('login_required');
          // 与正式课表一致：Canvas 课程权限错误也可能用401，只有认证响应头才表明需要换票。
          fail(response.headers.get('WWW-Authenticate') ? 'token_rejected' : 'permission_denied');
        }
        if (response.status === 403) fail('permission_denied');
        if (response.status === 429) fail('rate_limited');
        fail('http_' + response.status);
      }
      let data;
      try { data = await response.json(); } catch (_) { fail('login_or_non_json_response'); }
      return {data, response};
    }
    const profile = (await request('/api/v1/users/self/profile')).data;
    const accountId = identity(profile.id);
    if (config.accountId && identity(config.accountId) !== accountId) fail('account_changed');
    const meta = unwrap((await request(path)).data);
    if (identity(meta.id) !== tokenId || identity(meta.user_id) !== accountId || meta.purpose !== config.purpose || meta.workflow_state !== 'active') fail('wrong_test_token');
    const permanentExpiry = expiryTime(meta.permanent_expires_at);
    if (permanentExpiry !== null && (!Number.isFinite(permanentExpiry) || permanentExpiry <= io.now())) fail('permanent_expiry_requires_action');
    const expiry = expiryTime(meta.expires_at);
    if (expiry !== null && !Number.isFinite(expiry)) fail('invalid_expiry');
    let token = config.currentToken;
    let rotated = false;
    let oldStatus = null;
    let resultMeta = meta;
    async function rotate() {
      const csrf = io.csrf();
      if (!csrf) fail('csrf_missing');
      resultMeta = unwrap((await request(path, {method: 'PUT', headers: {
        'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest',
      }, body: 'access_token%5Bregenerate%5D=1'})).data);
      const nextToken = resultMeta.visible_token || resultMeta.token;
      if (!tokenText(nextToken)) fail('new_token_missing');
      // 先等待本机密钥库提交，验证或后续同步失败也能恢复新值。
      await io.saveCandidate({token: nextToken, tokenId, purpose: config.purpose,
        accountId, expiresAt: resultMeta.expires_at || null,
        permanentExpiresAt: resultMeta.permanent_expires_at || null});
      if (identity(resultMeta.id) !== tokenId || identity(resultMeta.user_id) !== accountId ||
          resultMeta.purpose !== config.purpose || scopes(meta.scopes) !== scopes(resultMeta.scopes) ||
          (resultMeta.permanent_expires_at || null) !== (meta.permanent_expires_at || null)) fail('rotation_identity_or_scope_changed');
      const previous = token;
      token = nextToken;
      rotated = true;
      if (previous) {
        try { const old = await io.fetch(ORIGIN + '/api/v1/users/self/profile', {
          credentials: 'omit', redirect: 'error', headers: {'Authorization': 'Bearer ' + previous, 'Accept': 'application/json'},
        }); oldStatus = old.status; } catch (_) { oldStatus = null; }
      }
    }
    if (!config.recoverCandidate && (config.forceRotate || !tokenText(token) || (expiry !== null && expiry <= io.now() + 25 * 60 * 1000))) await rotate();
    async function bearer(path) {
      return request(path, {credentials: 'omit', headers: {'Authorization': 'Bearer ' + token, 'Accept': 'application/json'}});
    }
    let tokenProfile;
    try { tokenProfile = (await bearer('/api/v1/users/self/profile')).data; }
    catch (error) {
      if (error.code !== 'token_rejected' || rotated || config.recoverCandidate) throw error;
      await rotate();
      tokenProfile = (await bearer('/api/v1/users/self/profile')).data;
    }
    if (identity(tokenProfile.id) !== accountId) fail('bearer_account_changed');
    await io.commitVerified();
    if (config.credentialsOnly) return {status: 'ok', rotated, oldStatus, expiresAt: resultMeta.expires_at || null};
    async function pages(path) {
      const seen = new Set();
      const rows = [];
      while (path) {
        const canonical = new URL(path, ORIGIN).href;
        if (seen.has(canonical) || seen.size >= 50) fail('pagination_limit');
        seen.add(canonical);
        const {data, response} = await bearer(canonical);
        if (!Array.isArray(data)) fail('invalid_list');
        rows.push(...data);
        if (rows.length > 10000) fail('list_limit');
        path = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get('Link') || '')?.[1] || null;
      }
      return rows;
    }
    const courses = await pages('/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100');
    if (courses.length > 100) fail('course_limit');
    let assignments = 0;
    let restrictedCourses = 0;
    for (const course of courses) {
      const id = identity(course.id);
      try { assignments += (await pages('/api/v1/courses/' + id + '/assignments?per_page=100')).length; }
      catch (error) { if (error.code === 'permission_denied') restrictedCourses++; else throw error; }
    }
    return {status: restrictedCourses ? 'partial' : 'ok', rotated, oldStatus, courses: courses.length, assignments,
      restrictedCourses, expiresAt: resultMeta.expires_at || null,
      permanentExpiresAt: resultMeta.permanent_expires_at || null};
  }
  async function listTokens(io) {
    if (io.origin !== ORIGIN) fail('login_required');
    async function read(path) {
      let response;
      try { response = await io.fetch(ORIGIN + path, {credentials: 'same-origin', redirect: 'error', headers: {'Accept': 'application/json'}}); }
      catch (_) { fail('network_or_session_redirect'); }
      if (!response.ok) fail(response.status === 401 ? 'login_required' : 'http_' + response.status);
      try { return await response.json(); } catch (_) { fail('login_or_non_json_response'); }
    }
    const accountId = identity((await read('/api/v1/users/self/profile')).id);
    const ids = new Set();
    for (const href of io.tokenLinks()) {
      let url;
      try { url = new URL(href, ORIGIN); } catch (_) { continue; }
      const match = /^\/profile\/tokens\/(\d+)$/.exec(url.pathname);
      if (url.origin === ORIGIN && match) ids.add(match[1]);
    }
    if (ids.size > 50) fail('list_limit');
    const tokens = [];
    for (const id of ids) {
      const meta = unwrap(await read('/profile/tokens/' + id));
      if (identity(meta.user_id) !== accountId || identity(meta.id) !== id) fail('account_changed');
      if (meta.workflow_state === 'active' && typeof meta.purpose === 'string' && meta.purpose.trim() && meta.purpose.length <= 200) {
        tokens.push({id, purpose: meta.purpose});
      }
    }
    return {status: 'ok', accountId, tokens};
  }
  function nativeRuntime(config) {
    const pending = new Map();
    function notify(kind, data) { root.ReactNativeWebView.postMessage(JSON.stringify({nonce: config.nonce, kind, ...data})); }
    root.__canvasLabAck = (kind, ok) => {
      const callback = pending.get(kind);
      if (callback) { pending.delete(kind); ok ? callback.resolve() : callback.reject(Object.assign(new Error('secure_save_failed'), {code: 'secure_save_failed'})); }
    };
    function save(kind, data) { return new Promise((resolve, reject) => { pending.set(kind, {resolve, reject}); notify(kind, data); }); }
    return {origin: location.origin, now: () => Date.now(), fetch: (...args) => fetch(...args),
      // 学校设置页把详情接口放在 .show_token_link 的 rel，而不是 href。
      tokenLinks: () => [...document.querySelectorAll('.access_token .show_token_link')]
        .flatMap(a => [a.getAttribute('rel'), a.getAttribute('href')]).filter(Boolean),
      // 学校真实前端同样从本 WebView 的 _csrf_token 取得 CSRF 值；不导出登录 Cookie。
      csrf: () => {
        const cookie = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('_csrf_token='));
        if (cookie) { try { return decodeURIComponent(cookie.slice('_csrf_token='.length)); } catch (_) { return null; } }
        return document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="authenticity_token"]')?.value;
      },
      saveCandidate: record => save('candidate', {record}), commitVerified: () => save('verified', {})};
  }
  const api = {run, listTokens, startList(config) {
    const io = nativeRuntime(config), controller = typeof AbortController === 'function' ? new AbortController() : null;
    const originalFetch = io.fetch;
    io.fetch = (url, options) => originalFetch(url, {...options, ...(controller ? {signal: controller.signal} : {})});
    let timer;
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => {
      if (controller) controller.abort();
      reject(Object.assign(new Error('network_or_session_redirect'), {code: 'network_or_session_redirect'}));
    }, 25000); });
    Promise.race([listTokens(io), deadline]).then(result => root.ReactNativeWebView.postMessage(JSON.stringify({nonce: config.nonce, kind: 'done', result})))
      .catch(error => root.ReactNativeWebView.postMessage(JSON.stringify({nonce: config.nonce, kind: 'done', result: {status: error.code || 'unexpected_failure'}})))
      .finally(() => { clearTimeout(timer); if (controller) controller.abort(); });
  }, start(config) {
    run(nativeRuntime(config), config).then(result => root.ReactNativeWebView.postMessage(JSON.stringify({nonce: config.nonce, kind: 'done', result})))
      .catch(error => root.ReactNativeWebView.postMessage(JSON.stringify({nonce: config.nonce, kind: 'done', result: {status: error.code || 'unexpected_failure'}})));
  }};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CanvasRotation = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
`;
