import { env } from '../config/env.js';
import { accessTokenMaxAgeMs, randomToken } from './tokens.js';

export const ACCESS_COOKIE = 'sw_access';
export const REFRESH_COOKIE = 'sw_refresh';
export const CSRF_COOKIE = 'sw_csrf';

const baseCookie = {
  secure: env.cookieSecure,
  sameSite: 'lax',
};

export function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseCookie,
    httpOnly: true,
    path: '/',
    maxAge: accessTokenMaxAgeMs(),
  });
}

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseCookie,
    httpOnly: true,
    // Only sent to authentication endpoints.
    path: '/api/auth',
    maxAge: env.refreshTokenDays * 86_400_000,
  });
}

export function setCsrfCookie(res, token = randomToken()) {
  res.cookie(CSRF_COOKIE, token, {
    ...baseCookie,
    httpOnly: false,
    path: '/',
    maxAge: env.refreshTokenDays * 86_400_000,
  });
  return token;
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  setCsrfCookie(res);
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie, httpOnly: true, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie, httpOnly: true, path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE, { ...baseCookie, httpOnly: false, path: '/' });
}
