import { decode } from 'html-entities';
import type { CanvasAssignment } from './types';

export const DEFAULT_CANVAS_URL = 'https://canvas.tongji.edu.cn';
export interface CanvasSnapshot { userId: string; assignments: CanvasAssignment[] }
export function canvasOrigin(value: string) {
  let url: URL;
  const input = value.trim() || DEFAULT_CANVAS_URL;
  try { url = new URL(input.includes('://') ? input : `https://${input}`); }
  catch { throw new Error('请填写有效的 Canvas 网站地址。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Canvas 地址需为 HTTPS 根网址，例如 https://canvas.tongji.edu.cn/。');
  return url.origin;
}
export function canvasToken(value: string) {
  const token = value.trim().replace(/^Bearer\s+/i, '');
  if (!/^[!-~]{1,4096}$/.test(token)) throw new Error('请粘贴完整的个人访问令牌，令牌中不能包含空格或换行。');
  return token;
}
export const canvasSettingsUrl = (base: string) => `${canvasOrigin(base)}/profile/settings`;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const numericId = (value: unknown) => (typeof value === 'string' || typeof value === 'number') && /^\d+$/.test(String(value));
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const plainText = (value: unknown) => decode(String(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<\/(p|div|li)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')).trim().slice(0, 2000);

export function canvasSubmissionCompleted(value: unknown): boolean | null {
  if (!object(value)) return null;
  // A grade (including an automatic missing-work grade) does not prove submission.
  // Reassigned, missing and explicitly unsubmitted work still needs attention.
  if (value.redo_request === true || value.missing === true || value.late_policy_status === 'missing' || value.workflow_state === 'unsubmitted') return false;
  if (value.workflow_state === 'submitted' || value.workflow_state === 'pending_review') return true;
  if (value.workflow_state === 'graded') return timestamp(value.submitted_at) !== null;
  return null;
}

export async function fetchCanvasSnapshot(base: string, value: string, parentSignal?: AbortSignal, transport: typeof fetch = fetch): Promise<CanvasSnapshot> {
  const origin = canvasOrigin(base), token = canvasToken(value), controller = new AbortController();
  const cancel = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  parentSignal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, 90000);
  const safeUrl = (input: string) => {
    const url = new URL(input, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/') || url.username || url.password || [...url.searchParams.keys()].some(key => /token|authorization/i.test(key))) throw new Error('Canvas 返回了无效的分页地址，已有作业已保留。');
    return url.href;
  };
  const request = async (path: string): Promise<{ value: unknown; link: string }> => {
    const response = await transport(safeUrl(path), { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? 'Canvas 令牌无效、已过期或已撤销，请在用户设置中重新生成令牌。' : response.status === 403 ? '此令牌没有读取课程或作业的权限，请检查 Canvas 访问权限。' : response.status === 429 ? 'Canvas 请求过于频繁，请稍后再同步。' : 'Canvas 同步失败，已有作业已保留。');
    if (response.redirected || response.url && new URL(response.url).origin !== origin) throw new Error('Canvas API 返回了登录跳转，请检查网址与访问令牌。');
    let result: unknown;
    try { result = await response.json(); } catch { throw new Error('Canvas API 未返回作业数据，请检查网址、访问令牌和校园网络。'); }
    return { value: result, link: response.headers.get('link') || '' };
  };
  const pages = async (path: string) => {
    const all: Record<string, unknown>[] = [], seen = new Set<string>();
    let next = safeUrl(path);
    while (next) {
      next = safeUrl(next);
      if (seen.has(next) || seen.size >= 200) throw new Error('Canvas 分页过多或重复，已有作业已保留。');
      seen.add(next);
      const result = await request(next);
      if (!Array.isArray(result.value) || !result.value.every(object) || all.length + result.value.length > 5000) throw new Error('Canvas 数据格式或数量异常，已有作业已保留。');
      all.push(...result.value);
      next = result.link.match(/<([^>]+)>\s*;\s*rel\s*=\s*["']?next["']?/i)?.[1] || '';
    }
    return all;
  };
  try {
    const profile = (await request('/api/v1/users/self/profile')).value;
    if (!object(profile) || !numericId(profile.id)) throw new Error('无法验证 Canvas 账户，请检查访问令牌。');
    const courses = await pages('/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100');
    const assignments = new Map<string, CanvasAssignment>(), firstSeenAt = new Date().toISOString();
    for (const course of courses) {
      if (!numericId(course.id)) throw new Error('Canvas 课程数据格式不正确。');
      const list = await pages(`/api/v1/courses/${course.id}/assignments?include%5B%5D=submission&per_page=100`);
      for (const item of list) {
        if (item.published === false) continue;
        if (!numericId(item.id) || typeof item.name !== 'string' || !item.name.trim()) throw new Error('Canvas 作业数据格式不正确。');
        const id = `${course.id}:${item.id}`, target = new URL(typeof item.html_url === 'string' ? item.html_url : `/courses/${course.id}/assignments/${item.id}`, origin);
        if (target.origin !== origin || target.username || target.password) throw new Error('Canvas 作业链接无效，已有作业已保留。');
        assignments.set(id, { id, courseId: String(course.id), courseName: String(course.name || course.course_code || '课程'), title: item.name.slice(0, 100), description: plainText(item.description),
          dueAt: timestamp(item.due_at), unlockAt: timestamp(item.unlock_at), createdAt: timestamp(item.created_at), firstSeenAt, url: target.href,
          submitted: canvasSubmissionCompleted(item.submission), completed: false });
        if (assignments.size > 5000) throw new Error('Canvas 作业数量过多，已有作业已保留。');
      }
    }
    if (controller.signal.aborted) throw new Error('Canvas 请求已取消。');
    return { userId: String(profile.id), assignments: [...assignments.values()] };
  } catch (error) {
    if (controller.signal.aborted) throw new Error(parentSignal?.aborted ? '已取消 Canvas 连接。' : 'Canvas 同步超时，已有作业已保留。');
    if (error instanceof TypeError) throw new Error('无法连接 Canvas。请检查网络；网页预览可能受到 Canvas 跨域限制，请在 iOS／Android App 中连接。');
    throw error;
  } finally { clearTimeout(timer); parentSignal?.removeEventListener('abort', cancel); }
}
