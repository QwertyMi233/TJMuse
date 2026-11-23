import type { CanvasAssignment, HomeworkPlatformState, HomeworkPreference } from './types';
import { mergeHomework } from './homework';

export const HOMEWORK_TRASH_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
export function homeworkTrashExpiresAt(preference?: HomeworkPreference): number | null {
  if (!preference?.deleted || preference.purged || !preference.deletedAt) return null;
  const deleted = Date.parse(preference.deletedAt);
  return Number.isFinite(deleted) ? deleted + HOMEWORK_TRASH_RETENTION_MS : null;
}
export function cleanHomeworkTrash<T extends HomeworkPlatformState>(canvas: T, now = new Date(), clearAll = false): T {
  let changed = false;
  const preferences = { ...canvas.preferences };
  for (const [id, pref] of Object.entries(preferences)) {
    if (!pref.deleted) continue;
    const expires = homeworkTrashExpiresAt(pref);
    if (pref.purged || clearAll || expires !== null && expires <= now.getTime()) {
      // Keep only the identity in the map key, never the assignment content.
      if (!pref.purged || pref.deletedAt || pref.visibility !== 'default' || pref.completedOverride !== undefined) {
        preferences[id] = { visibility: 'default', deleted: true, purged: true };
        changed = true;
      }
    } else if (expires === null) {
      // Older releases had no deletion date. Give these items a full recovery window.
      preferences[id] = { ...pref, deletedAt: now.toISOString() };
      changed = true;
    }
  }
  const assignments = canvas.assignments.filter(a => !preferences[a.id]?.purged);
  if (assignments.length !== canvas.assignments.length) changed = true;
  return changed ? { ...canvas, preferences, assignments } : canvas;
}
export function changeHomeworkPreference<T extends HomeworkPlatformState>(canvas: T, id: string, change: Partial<HomeworkPreference>, now = new Date()): T {
  const current = cleanHomeworkTrash(canvas, now), previous = current.preferences[id];
  if (previous?.purged || !current.assignments.some(a => a.id === id)) return current;
  const next: HomeworkPreference = { visibility: previous?.visibility || 'default', deleted: previous?.deleted || false, ...previous };
  if (change.visibility !== undefined) next.visibility = change.visibility;
  if (change.deleted === true && !next.deleted) { next.deleted = true; next.deletedAt = now.toISOString(); }
  if (change.deleted === false) { next.deleted = false; delete next.deletedAt; delete next.purged; }
  return { ...current, preferences: { ...current.preferences, [id]: next } };
}
export function mergeCanvasHomework<T extends HomeworkPlatformState>(canvas: T, incoming: CanvasAssignment[], now = new Date()): T {
  const current = cleanHomeworkTrash(canvas, now);
  // Retain explicit choices even if an assignment temporarily disappears from the API.
  const preferences = { ...current.preferences };
  for (const a of current.assignments) {
    const override = typeof a.completedOverride === 'boolean' ? a.completedOverride : a.completed ? true : undefined;
    if (override !== undefined && typeof preferences[a.id]?.completedOverride !== 'boolean') {
      preferences[a.id] = { visibility: 'default', deleted: false, ...preferences[a.id], completedOverride: override };
    }
  }
  // Deleted snapshots stay unchanged for recovery, even if absent from the API.
  const live = incoming.filter(a => !current.preferences[a.id]?.deleted);
  const deleted = current.assignments.filter(a => current.preferences[a.id]?.deleted);
  const merged = mergeHomework(current.assignments, live, current.lastSync).map(a => {
    const override = preferences[a.id]?.completedOverride;
    return typeof override === 'boolean' ? { ...a, completed: override, completedOverride: override } : a;
  });
  return { ...current, preferences, assignments: [...merged, ...deleted] };
}
