import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { dashboardQuerySchema } from '../validators/schemas.js';
import { summary } from '../controllers/dashboard.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/summary', validate({ query: dashboardQuerySchema }), summary);

export default router;
