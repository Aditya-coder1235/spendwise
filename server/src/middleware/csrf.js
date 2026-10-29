import crypto from 'node:crypto';
import { ApiError } from '../utils/api-error.js';
import { CSRF_COOKIE } from '../utils/cookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/health',
]);

/**
 * Double-submit CSRF protection for cookie-authenticated mutations.
 * The CSRF cookie is readable by our own JavaScript, while the access and
 * refresh tokens remain HttpOnly.
 */
export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method) || CSRF_EXEMPT_PATHS.has(req.originalUrl.split('?')[0])) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    return next(new ApiError(403, 'Missing CSRF token. Refresh the page and try again.', 'CSRF_FAILED'));
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new ApiError(403, 'Invalid CSRF token. Refresh the page and try again.', 'CSRF_FAILED'));
  }

  return next();
}
