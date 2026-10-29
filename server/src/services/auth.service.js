import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';
import {
  hashToken,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { ensureDefaultCategories } from './category.service.js';

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredCurrency: user.preferredCurrency,
    theme: user.theme,
    dateFormat: user.dateFormat,
    warningThreshold: user.warningThreshold,
    createdAt: user.createdAt,
  };
}

async function createSession(user, req) {
  const sessionId = new mongoose.Types.ObjectId();
  const jti = randomToken(16);
  const refreshToken = signRefreshToken(user.id, sessionId, jti);
  const accessToken = signAccessToken(user.id, sessionId);

  await Session.create({
    _id: sessionId,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    userAgent: (req.get('user-agent') || '').slice(0, 255),
    ip: (req.ip || '').slice(0, 64),
    expiresAt: new Date(Date.now() + env.refreshTokenDays * 86_400_000),
  });

  return { accessToken, refreshToken };
}

function tokensMatch(storedHash, token) {
  const candidate = Buffer.from(hashToken(token));
  const stored = Buffer.from(storedHash);
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

export async function registerUser(input, req) {
  const existing = await User.exists({ email: input.email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');
  }

  const passwordHash = await User.hashPassword(input.password);
  let user;
  try {
    user = await User.create({ name: input.name, email: input.email, passwordHash });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');
    }
    throw error;
  }

  await ensureDefaultCategories(user.id);
  const tokens = await createSession(user, req);
  return { user: publicUser(user), tokens };
}

export async function loginUser(input, req) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const valid = user ? await user.verifyPassword(input.password) : false;
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  await ensureDefaultCategories(user.id);
  const tokens = await createSession(user, req);
  return { user: publicUser(user), tokens };
}

export async function refreshSession(refreshToken, req) {
  if (!refreshToken) {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'REFRESH_MISSING');
  }

  const payload = verifyRefreshToken(refreshToken);
  const session = await Session.findOne({
    _id: payload.sid,
    userId: payload.sub,
    expiresAt: { $gt: new Date() },
  });
  if (!session || !tokensMatch(session.tokenHash, refreshToken)) {
    throw new ApiError(401, 'Your session is no longer valid. Please sign in again.', 'REFRESH_INVALID');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    await Session.deleteOne({ _id: session.id });
    throw new ApiError(401, 'Your account could not be found.', 'USER_NOT_FOUND');
  }

  const nextJti = randomToken(16);
  const newRefreshToken = signRefreshToken(user.id, session._id, nextJti);
  const accessToken = signAccessToken(user.id, session._id);
  session.tokenHash = hashToken(newRefreshToken);
  session.expiresAt = new Date(Date.now() + env.refreshTokenDays * 86_400_000);
  session.userAgent = (req.get('user-agent') || session.userAgent || '').slice(0, 255);
  await session.save();

  return {
    user: publicUser(user),
    tokens: { accessToken, refreshToken: newRefreshToken },
  };
}

export async function logoutSession(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await Session.deleteOne({ _id: payload.sid, userId: payload.sub });
  } catch {
    // Logout is intentionally idempotent even if the token has expired.
  }
}

export async function updateProfile(user, input) {
  const editable = ['name', 'preferredCurrency', 'dateFormat', 'theme', 'warningThreshold'];
  const updates = {};
  for (const key of editable) {
    if (input[key] !== undefined) updates[key] = input[key];
  }
  const updated = await User.findOneAndUpdate({ _id: user.id }, { $set: updates }, {
    returnDocument: 'after',
    runValidators: true,
  });
  return publicUser(updated);
}

export async function changePassword(user, currentPassword, newPassword) {
  const userWithPassword = await User.findById(user.id).select('+passwordHash');
  const valid = await userWithPassword.verifyPassword(currentPassword);
  if (!valid) {
    throw new ApiError(401, 'Your current password is incorrect.', 'INVALID_PASSWORD');
  }

  userWithPassword.passwordHash = await User.hashPassword(newPassword);
  await userWithPassword.save();
  // Revoke every refresh session after a password change.
  await Session.deleteMany({ userId: user.id });
}

export { publicUser };
