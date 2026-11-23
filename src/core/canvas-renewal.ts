import type { CanvasRenewal } from './types';
export function canvasRenewalDue(config: CanvasRenewal, now = Date.now()) {
  if (!config.enabled || config.status === 'needs-login') return false;
  if (config.lastAttempt && now - new Date(config.lastAttempt).getTime() < 30 * 60000) return false;
  return !config.lastRotated || now - new Date(config.lastRotated).getTime() >= 30 * 60000 || !!config.expiresAt && new Date(config.expiresAt).getTime() <= now + 25 * 60000;
}

export function canvasSessionCheckDue(config: CanvasRenewal, now = Date.now(), resumed = false) {
  if (!config.enabled) return false;
  const last = config.lastSessionAttempt && new Date(config.lastSessionAttempt).getTime();
  const interval = resumed ? 2 * 60000 : (config.status === 'needs-login' ? 30 : 10) * 60000;
  return !last || !Number.isFinite(last) || now < last || now - last >= interval;
}

export const canvasSessionNeedsLogin = (code: string) => ['login_required','login_requires_interaction','login_or_web_timeout','login_or_non_json_response','account_changed','bearer_account_changed','wrong_test_token','rotation_identity_or_scope_changed','permanent_expiry_requires_action'].includes(code);
export const canvasMaintenanceBlocks = (code: string) => ['account_changed','bearer_account_changed','wrong_test_token','rotation_identity_or_scope_changed','secure_save_or_bridge_failed','secure_save_failed'].includes(code);
export const canvasSessionCanRecover = (config: CanvasRenewal) => !canvasMaintenanceBlocks(config.lastErrorCode||'') && config.lastErrorCode!=='permanent_expiry_requires_action';

// The reference project continues with its saved Bearer token when the browser
// session expires. A changed identity or an uncommitted credential must still stop.
export async function withCanvasMaintenance<T>(maintain: () => Promise<void>, read: () => Promise<T>): Promise<T> {
  try { await maintain(); }
  catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (canvasMaintenanceBlocks(code)) throw error;
  }
  return read();
}
