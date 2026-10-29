import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/api-error.js';
import { ACCESS_COOKIE } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    throw new ApiError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
  }

  const payload = verifyAccessToken(token);
  const [user, session] = await Promise.all([
    User.findById(payload.sub),
    Session.findOne({ _id: payload.sid, userId: payload.sub, expiresAt: { $gt: new Date() } }),
  ]);

  if (!user || !session) {
    throw new ApiError(401, 'Your session is no longer valid. Please sign in again.', 'SESSION_INVALID');
  }

  req.user = user;
  req.sessionId = session.id;
  return next();
});
