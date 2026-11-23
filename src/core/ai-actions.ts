import {parsePriority} from './task-priority';
import type { FlexibleTask } from './types';
export interface FlexibleDraft extends Pick<FlexibleTask,'important'|'urgent'> { title: string; description: string }
export const addFlexibleTool = { type: 'function', function: { name: 'add_flexible_tasks', description: '用户明确要求添加小事时，将无固定时间的事项加入“慢慢实现的小事”。不能修改或删除已有任务。', parameters: {
  type: 'object', properties: { tasks: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', properties: { important:{type:'boolean'}, urgent:{type:'boolean'}, title: { type: 'string', maxLength: 100 }, description: { type: 'string', maxLength: 2000 } }, required: ['title', 'description'], additionalProperties: false } } }, required: ['tasks'], additionalProperties: false,
} } };
export function parseFlexibleArguments(raw: string): FlexibleDraft[] {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('AI 添加事项的参数格式不正确，未保存更改。'); }
  if (!value || Object.keys(value).some(key => key !== 'tasks') || !Array.isArray(value.tasks) || value.tasks.length < 1 || value.tasks.length > 10) throw new Error('AI 每次可添加 1–10 件小事，未保存更改。');
  return value.tasks.map((task: unknown) => {
    const item = task as FlexibleDraft;
    if (!item || Object.keys(item).some(key => !['title', 'description', 'important', 'urgent'].includes(key)) || typeof item.title !== 'string' || !item.title.trim() || item.title.trim().length > 100 || typeof item.description !== 'string' || item.description.length > 2000) throw new Error('AI 添加事项的名称或描述无效，未保存更改。');
    const priority=parsePriority(item as unknown as Record<string,unknown>);
    return { title: item.title.trim(), description: item.description.trim(),...(item.important!==undefined||item.urgent!==undefined?priority:{}) };
  });
}
export const flexibleTitleKey = (title: string) => title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export function mergeFlexible(existing: FlexibleTask[], drafts: FlexibleDraft[], id: () => string) {
  const keys = new Set(existing.map(task => flexibleTitleKey(task.title))), added: FlexibleTask[] = [];
  for (const draft of drafts) {
    const key = flexibleTitleKey(draft.title);
    if (keys.has(key)) continue;
    keys.add(key); added.push({ ...draft, id: id(), completed: false });
  }
  return { tasks: [...existing, ...added], added };
}
