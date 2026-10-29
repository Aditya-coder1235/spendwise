import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './api-error.js';

const ISSUER = 'spendwise-api';
const AUDIENCE = 'spendwise-client';

export function signAccessToken(userId, sessionId) {
  return jwt.sign({ sub: userId.toString(), sid: sessionId.toString(), typ: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function signRefreshToken(userId, sessionId, jti) {
  return jwt.sign(
    { sub: userId.toString(), sid: sessionId.toString(), jti, typ: 'refresh' },
    env.jwtRefreshSecret,
    {
      expiresIn: `${env.refreshTokenDays}d`,
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (payload.typ !== 'access') throw new Error('Wrong token type');
    return payload;
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'TOKEN_INVALID');
  }
}

export function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (payload.typ !== 'refresh') throw new Error('Wrong token type');
    return payload;
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'REFRESH_INVALID');
  }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function accessTokenMaxAgeMs() {
  const value = env.accessTokenTtl;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return amount * unit;
}
