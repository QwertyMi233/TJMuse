// Protocol adapted from TJ-Class-Schedule (MIT, Copyright (c) 2026 Algernon).
// See THIRD_PARTY_NOTICES.md. Only the listed read and session endpoints are used.
import type { CanvasAssignment } from './types';
import {isExpiredPlatformSession} from './platform-session-errors';
export const HAOKE_ORIGIN = 'https://tongji.aihaoke.net';
export interface HaokeCredentials { token: string; ticket: string; userId: string }
export class HaokeError extends Error { constructor(message: string, public code = 0) { super(message); } }
export async function withHaokeLoginRecovery<T>(read:()=>Promise<T>,login:()=>Promise<T>):Promise<T>{
  try{return await read();}catch(error){if(!(error instanceof HaokeError)||![401,403].includes(error.code))throw error;return login();}
}
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
export function haokeSecret(value: unknown) {
  if (typeof value !== 'string' || !/^[!-~]{1,4096}$/.test(value)) throw new HaokeError('好课登录凭据不完整，请重新登录。');
  return value;
}
export function haokeDate(value: unknown): string | null {
  if (value == null || value === '' || String(value).startsWith('9999')) return null;
  if (typeof value !== 'string') throw new HaokeError('好课日期格式无法识别，已有作业保留。');
  let text = value.trim().replace(' ', 'T');
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(text)) text += '+08:00';
  const at = new Date(text);
  if (!Number.isFinite(at.getTime())) throw new HaokeError('好课日期格式无法识别，已有作业保留。');
  return at.toISOString();
}
const id = (v: unknown) => { if (!/^\d+$/.test(String(v)) || String(v).length > 30) throw new HaokeError('好课数据编号无效。'); return String(v); };
const paths = ['/api/auth/queryCurrentUserInfo', '/api/auth/tokenLogin', '/api/teach/instance/listMyClass', '/api/learn/task/listTask', '/api/learn/task/queryClassInfo', '/api/learn/examine/examineList'];
// Request IDs follow the UUID shape expected by the platform; they are not secrets.
const requestId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
  const random = Math.floor(Math.random() * 16); return (char === 'x' ? random : random & 3 | 8).toString(16);
});
export async function withHaokeRequestDeadline<T>(work:(signal:AbortSignal)=>Promise<T>,signal?:AbortSignal,timeoutMs=15000):Promise<T>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  const cancelled=()=>new HaokeError('好课同步已取消或超时，已有作业保留。');
  let interrupt:(()=>void)|undefined;
  const interrupted=new Promise<never>((_,reject)=>{interrupt=()=>{controller.abort();reject(cancelled());};});
  if(signal?.aborted)throw cancelled();
  signal?.addEventListener('abort',interrupt!,{once:true});timer=setTimeout(interrupt!,timeoutMs);
  try{return await Promise.race([interrupted,Promise.resolve().then(()=>{if(controller.signal.aborted)throw cancelled();return work(controller.signal);})]);}
  finally{if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',interrupt!);}
}
export function haokeClient(token: string, transport: typeof fetch = fetch, signal?: AbortSignal) {
  const credential = haokeSecret(token), deadline = Date.now() + 120000;
  return async (path: string, body: Record<string, unknown>): Promise<Record<string, any>> => {
    if (!paths.includes(path)) throw new HaokeError('好课接口不在允许列表中。');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new HaokeError('好课同步超时，已有作业保留。');
    return withHaokeRequestDeadline(async requestSignal=>{try {
      const response = await transport(HAOKE_ORIGIN + path, { method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: requestSignal,
        headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json', 'Content-Type': 'application/json', 'X-Language': 'zh-CN' },
        body: JSON.stringify({ ...body, requestId: requestId() }) });
      if (!response.ok) {
        if([401,403].includes(response.status))throw new HaokeError('好课登录已失效或权限不足，请重新连接。',401);
        const errorText=await response.text();
        if(errorText.length<=2000000){let failure:unknown;try{failure=JSON.parse(errorText);}catch{}if(object(failure)&&isExpiredPlatformSession(response.status,failure.code??failure.status,failure.message||failure.msg))throw new HaokeError('好课登录已失效，请重新连接。',401);}
        throw new HaokeError('好课读取失败，已有作业保留。',response.status);
      }
      if (response.redirected || response.url && new URL(response.url).origin !== HAOKE_ORIGIN) throw new HaokeError('好课返回了登录跳转，请重新连接。', 401);
      const text = await response.text();
      if (text.length > 2000000) throw new HaokeError('好课返回数据超过读取上限。');
      let value: unknown; try { value = JSON.parse(text); } catch { throw new HaokeError(/<html|<!doctype/i.test(text)&&/login|登录/i.test(text)?'好课登录已失效，请重新连接。':'好课返回格式发生变化，已有作业保留。',/<html|<!doctype/i.test(text)&&/login|登录/i.test(text)?401:0); }
      if(object(value)&&isExpiredPlatformSession(response.status,value.code,value.message||value.msg))throw new HaokeError('好课登录已失效，请重新连接。',401);
      if (!object(value) || Number(value.code) !== 200 || !object(value.data)) throw new HaokeError(object(value) && [401,403].includes(Number(value.code)) ? '好课登录已失效或权限不足，请重新连接。' : '好课读取失败，已有作业保留。', object(value) ? Number(value.code) : 0);
      return value.data;
    } catch (e) {
      if (e instanceof HaokeError) throw e;
      throw new HaokeError(requestSignal.aborted ? '好课同步已取消或超时，已有作业保留。' : '无法连接好课，请检查网络。');
    }},signal,Math.min(15000,remaining));
  };
}
export async function readHaokeCredentials(token: string, transport?: typeof fetch, signal?:AbortSignal): Promise<HaokeCredentials> {
  const data = await haokeClient(token, transport, signal)('/api/auth/queryCurrentUserInfo', {});
  if (!object(data.userInfo)) throw new HaokeError('无法确认好课账户。');
  return { token: haokeSecret(data.token), ticket: haokeSecret(data.ticket), userId: id(data.userInfo.userId) };
}
export async function renewHaokeCredentials(pair: HaokeCredentials, transport?: typeof fetch, signal?:AbortSignal): Promise<HaokeCredentials> {
  const data = await haokeClient(pair.token, transport, signal)('/api/auth/tokenLogin', { token: pair.token, ticket: haokeSecret(pair.ticket) });
  // Persist this candidate before making any further network request.
  return { token: haokeSecret(data.token), ticket: haokeSecret(data.ticket), userId: pair.userId };
}
export async function verifyHaokeAccount(token: string, expected: string, transport?: typeof fetch, signal?:AbortSignal) {
  const data = await haokeClient(token, transport, signal)('/api/auth/queryCurrentUserInfo', {});
  if (!object(data.userInfo) || id(data.userInfo.userId) !== expected) throw new HaokeError('好课账户已改变，请重新连接确认。', 409);
}
export async function fetchHaokeSnapshot(token: string, transport?: typeof fetch, signal?: AbortSignal) {
  const post = haokeClient(token, transport, signal), syncedAt = new Date().toISOString();
  const identity = await post('/api/auth/queryCurrentUserInfo', {});
  if (!object(identity.userInfo)) throw new HaokeError('无法确认好课账户。');
  const userId = id(identity.userInfo.userId);
  const listing = await post('/api/teach/instance/listMyClass', { instanceName: '' });
  if (!Array.isArray(listing.teachClassResponseList) || listing.teachClassResponseList.length > 100) throw new HaokeError('好课课程列表格式或数量异常。');
  const assignments = new Map<string, CanvasAssignment>();
  async function pages(path: string, body: Record<string, unknown>, key: string) {
    const rows: Record<string, any>[] = [], fingerprints = new Set<string>();
    for (let pageNo = 1; pageNo <= 200; pageNo++) {
      const data = await post(path, { ...body, page: { pageNo, pageSize: 50 } });
      const total = Number(data.totalRowCount), page = data.rowList;
      if (!Number.isInteger(total) || total < 0 || total > 5000 || !Array.isArray(page) || !page.every(object)) throw new HaokeError('好课作业分页格式异常。');
      const fingerprint = JSON.stringify(page.map(row => row[key]));
      if (page.length && fingerprints.has(fingerprint)) throw new HaokeError('好课重复返回同一页，已有作业保留。');
      fingerprints.add(fingerprint); rows.push(...page);
      if (rows.length > 5000) throw new HaokeError('好课作业超过同步上限。');
      if (rows.length >= total) return rows;
      if (!page.length) throw new HaokeError('好课分页未完整读取，已有作业保留。');
    }
    throw new HaokeError('好课分页超过同步上限。');
  }
  const classes = new Set<string>();
  for (const course of listing.teachClassResponseList) {
    if (!object(course) || typeof course.instanceName !== 'string' || !course.instanceName.trim()) throw new HaokeError('好课课程字段无效。');
    const courseId = id(course.classId), classId = Number(courseId);
    if (!Number.isSafeInteger(classId)) throw new HaokeError('好课课程编号超出安全范围。');
    if (classes.has(courseId)) continue; classes.add(courseId);
    const courseName = course.instanceName.trim().slice(0, 100), instanceId = String(course.instanceId ?? '');
    const add = (row: Record<string, any>, column?: Record<string, any>, exam = false) => {
      const taskId = id(row[exam ? 'examineId' : 'taskId']), title = row[exam ? 'examineName' : 'taskName'];
      if (typeof title !== 'string' || !title.trim()) throw new HaokeError('好课任务缺少标题。');
      const returned = String(row.continueType) === '20';
      const submitted = exam ? String(row.submitFlag) === '1' : !returned && (['20','30'].includes(String(row.myStatus)) || String(row.exemptFlag) === '1');
      const key = `haoke:${courseId}:${exam ? 'exam:' : ''}${taskId}`, url = new URL(`${HAOKE_ORIGIN}/student/course/${courseId}/${exam ? 'examines/home' : 'task'}`);
      url.searchParams.set('instanceId', instanceId);
      if (exam) url.searchParams.set('examineId', taskId);
      else if (column?.columnId != null) { url.searchParams.set('columnId', String(column.columnId)); url.searchParams.set('taskType', String(column.columnCode || 'task')); }
      assignments.set(key, { id: key, platform: 'haoke', courseId, courseName, title: title.trim().slice(0, 100),
        description: returned ? '已退回，需要重新提交。' : exam ? '好课测验，详细要求请查看原平台。' : '好课作业，详细要求请查看原平台。',
        dueAt: haokeDate(row.endTime), unlockAt: row.startTime ? haokeDate(row.startTime) : null, firstSeenAt: syncedAt, createdAt: null,
        submitted, completed: false, url: url.href });
      if (assignments.size > 5000) throw new HaokeError('好课作业超过同步上限。');
    };
    const body = { classId, orderType: 0, searchText: '', status: 0, taskTypes: [], requireFlag: null, exemptFlag: null };
    for (const row of await pages('/api/learn/task/listTask', body, 'taskId')) add(row);
    const info = await post('/api/learn/task/queryClassInfo', { classId });
    if (!Array.isArray(info.columnList)) throw new HaokeError('好课课程栏目格式异常。');
    let columnsRead = 0;
    async function columns(list: unknown[], depth = 0) {
      if (depth > 6) throw new HaokeError('好课栏目层级异常。');
      for (const column of list) {
        if (!object(column) || ++columnsRead > 200) throw new HaokeError('好课栏目格式或数量异常。');
        if (column.columnCode === 'examines') {
          for (const parent of await pages('/api/learn/examine/examineList', { teachClassId: classId, instanceId: course.instanceId, searchText: '', examineStatus: 0 }, 'examineId')) {
            add(parent, column, true);
            if (object(parent.makeupExam) && parent.makeupExam.examineId != null) add(parent.makeupExam, column, true);
          }
        }
        if (Array.isArray(column.subList)) await columns(column.subList, depth + 1);
      }
    }
    await columns(info.columnList);
  }
  return { userId, assignments: [...assignments.values()] };
}
