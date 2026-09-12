export const DEFAULT_ADMIN_BOOTSTRAP_PASSWORD = 'AnvationAdmin@2026!';

export function resolveAdminBootstrapPassword(env: Record<string, string | undefined> = process.env): string {
  const configured = typeof env.ADMIN_BOOTSTRAP_PASSWORD === 'string'
    ? env.ADMIN_BOOTSTRAP_PASSWORD.trim()
    : '';

  return configured || DEFAULT_ADMIN_BOOTSTRAP_PASSWORD;
}
