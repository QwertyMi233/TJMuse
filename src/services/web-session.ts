export interface CanvasTokenOption { id: string; purpose: string; accountId: string }
export interface CanvasCandidate { token: string; tokenId: string; purpose: string; accountId: string; expiresAt: string | null; permanentExpiresAt: string | null; quarantined?: boolean }
import type { TimetableCapture } from '../core/timetable';
import {createSessionQueue} from '../core/session-queue';
export interface SessionJob {
  onDismissed?:()=>void; // Canvas token-list: native presenter is gone.
  onPresented?:()=>void; // Canvas manual browser: first native load event.
  signal?:AbortSignal;
  kind: 'canvas-browser' | 'canvas-list' | 'canvas-rotate' | 'canvas-keepalive' | 'haoke-login' | 'zhixuemeng-sync' | 'timetable';
  config?: Record<string, unknown>;
  onCandidate?: (candidate: CanvasCandidate) => Promise<void>;
  onVerified?: () => Promise<void>;
  silent?: boolean;
}
export interface SessionResult { homework?:{userId:string;assignments:import('../core/types').CanvasAssignment[]}; status: string; accountId?: string; tokens?: CanvasTokenOption[]; token?: string; rotated?: boolean; expiresAt?: string | null; timetable?: TimetableCapture; loginAttempt?:{id:string;attemptId:string} }
export class WebSessionError extends Error { constructor(public code: string) { super(sessionErrorMessage(code)); } }
export function sessionErrorMessage(code: string) {
  if(code==='login_page_not_ready')return '登录页面尚未就绪，本机登录信息已保留。可重新加载网页，下次打开 App 也会自动再试。';
  if(code==='login_requires_interaction')return '自动登录已暂停，请打开官方登录页完成验证码／二次验证，或检查保存的学号密码。';
  if (['login_required','login_or_web_timeout','network_or_session_redirect','login_or_non_json_response'].includes(code)) return '网页登录已失效，请在连接设置中重新登录。';
  if (['account_changed','bearer_account_changed','wrong_test_token','rotation_identity_or_scope_changed'].includes(code)) return '账户或令牌权限已改变，已停止更新，请重新连接确认。';
  if (code === 'permanent_expiry_requires_action') return '学校设置的永久期限已到，请手动创建新的专用令牌。';
  if (code === 'unavailable') return '请在 iOS／Android 中使用官方网页登录；浏览器演示使用示例连接。';
  if (code === 'busy') return '网页登录正在处理中，请稍候。';
  if (code === 'cancelled') return '已取消连接。';
  return '连接维护未完成，已保存的凭据和作业保留，可稍后重试。';
}
let host: ((job: SessionJob) => Promise<SessionResult>) | null = null;
export function registerSessionHost(value: NonNullable<typeof host>) { host = value; return () => { if (host === value) host = null; }; }
// Background recovery never blocks a manual login indefinitely.
const queue=createSessionQueue();
export const sessionTimeoutMs=(job:SessionJob)=>job.kind==='zhixuemeng-sync'?(job.silent?120000:10*60000):job.kind==='canvas-keepalive'?30000:job.silent?60000:job.kind==='canvas-rotate'?90000:10*60000;
export const runOfficialSession=(job:SessionJob):Promise<SessionResult>=>queue.enqueue({
 background:job.silent===true||job.kind==='canvas-keepalive'||job.kind==='canvas-rotate',
 preemptible:(job.kind==='haoke-login'||job.kind==='zhixuemeng-sync')&&job.silent===true||job.kind==='canvas-keepalive',signal:job.signal,
 timeoutMs:sessionTimeoutMs(job),
 cancelError:()=>new WebSessionError('cancelled'),timeoutError:()=>new WebSessionError('login_or_web_timeout'),
 run:signal=>host?host({...job,signal}):Promise.reject(new WebSessionError('unavailable')),
});
