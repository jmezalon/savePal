import { Request, Response, NextFunction } from 'express';

// Password-like fields are preserved as-is — users may have registered with
// leading/trailing whitespace and trimming would lock them out.
const SKIP_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
]);

function trimDeep(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    return key && SKIP_KEYS.has(key) ? value : value.trim();
  }
  if (Array.isArray(value)) {
    return value.map((item) => trimDeep(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = trimDeep(v, k);
    }
    return out;
  }
  return value;
}

/**
 * Recursively trims whitespace from all string fields in req.body so that
 * stray leading/trailing spaces never reach validation, the database, or
 * external services (Stripe, etc.). Skips password fields.
 */
export function trimBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = trimDeep(req.body);
  }
  next();
}
