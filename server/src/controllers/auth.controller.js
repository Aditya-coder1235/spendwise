import { asyncHandler } from '../utils/api-error.js';
import { clearAuthCookies, setAuthCookies, REFRESH_COOKIE } from '../utils/cookies.js';
import {
  changePassword,
  loginUser,
  logoutSession,
  publicUser,
  refreshSession,
  registerUser,
  updateProfile,
} from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, tokens } = await registerUser(req.validated.body, req);
  setAuthCookies(res, tokens);
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const { user, tokens } = await loginUser(req.validated.body, req);
  setAuthCookies(res, tokens);
  res.json({ success: true, data: { user } });
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, tokens } = await refreshSession(req.cookies?.[REFRESH_COOKIE], req);
    setAuthCookies(res, tokens);
    res.json({ success: true, data: { user } });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await logoutSession(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Signed out.' } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user, req.validated.body);
  res.json({ success: true, data: { user } });
});

export const changeMyPassword = asyncHandler(async (req, res) => {
  await changePassword(
    req.user,
    req.validated.body.currentPassword,
    req.validated.body.newPassword,
  );
  clearAuthCookies(res);
  res.json({
    success: true,
    data: { message: 'Password changed. Please sign in again with your new password.' },
  });
});
