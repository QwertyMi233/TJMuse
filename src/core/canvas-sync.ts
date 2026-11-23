import { dateKey } from './calendar';
export function canvasAutoSyncSlot(now: Date): string | null {
  if (now.getMinutes() !== 0 || ![0, 12].includes(now.getHours())) return null;
  return `${dateKey(now)}T${String(now.getHours()).padStart(2, '0')}:00`;
}
export function nextCanvasAutoSync(now: Date): Date {
  const next = new Date(now);
  if (now.getHours() < 12) next.setHours(12, 0, 0, 0);
  else { next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0); }
  return next;
}
