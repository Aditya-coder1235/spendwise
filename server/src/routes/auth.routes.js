import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from '../validators/schemas.js';
import {
  changeMyPassword,
  login,
  logout,
  me,
  refresh,
  register,
  updateMe,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please wait and try again.',
    },
  },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/profile', requireAuth, validate({ body: profileSchema }), updateMe);
router.put('/password', requireAuth, validate({ body: changePasswordSchema }), changeMyPassword);

export default router;
