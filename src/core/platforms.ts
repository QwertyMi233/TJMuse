import type { AppData, CanvasAssignment, HomeworkPreference } from './types';
import {projectHomework} from './local-overrides';
export const PLATFORM_ORDER = ['canvas', 'haoke', 'zhixuemeng'] as const;
export type PlatformId = typeof PLATFORM_ORDER[number];
export const platformName = (id: PlatformId) => id === 'zhixuemeng' ? '智学盟' : id === 'haoke' ? '好课' : 'Canvas';
export const assignmentPlatform = (assignment: CanvasAssignment): PlatformId => assignment.platform === 'zhixuemeng' ? 'zhixuemeng' : assignment.platform === 'haoke' ? 'haoke' : 'canvas';
export const homeworkPlatform = (id: string): PlatformId => id.startsWith('zhixuemeng:') ? 'zhixuemeng' : id.startsWith('haoke:') ? 'haoke' : 'canvas';
export const allHomework = (data: AppData) => PLATFORM_ORDER.flatMap(id=>(data[id]?.assignments||[]).map(a=>projectHomework(a,data[id].preferences[a.id])));
export const allHomeworkPreferences = (data: AppData): Record<string, HomeworkPreference> => ({ ...data.canvas.preferences, ...data.haoke.preferences,...data.zhixuemeng?.preferences });
export interface PlatformSyncResult { platform: PlatformId; status: 'success' | 'failed' | 'skipped'; message: string }
export async function syncConnectedPlatforms(connected: Record<PlatformId, boolean>, sync: Record<PlatformId, () => Promise<void>>): Promise<PlatformSyncResult[]> {
  return Promise.all(PLATFORM_ORDER.map(async platform => {
    if (!connected[platform]) return { platform, status: 'skipped' as const, message: '尚未连接' };
    try { await sync[platform](); return { platform, status: 'success' as const, message: '同步完成' }; }
    catch (e) { return { platform, status: 'failed' as const, message: e instanceof Error ? e.message : '同步失败，已有作业保留' }; }
  }));
}
