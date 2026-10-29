import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  analyticsQuerySchema,
  dailyQuerySchema,
} from '../validators/schemas.js';
import {
  categories,
  daily,
  incomeExpenses,
  topCategories,
  trends,
} from '../controllers/analytics.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/categories', validate({ query: analyticsQuerySchema }), categories);
router.get('/top-categories', validate({ query: analyticsQuerySchema }), topCategories);
router.get('/trends', validate({ query: analyticsQuerySchema }), trends);
router.get('/income-expenses', validate({ query: analyticsQuerySchema }), incomeExpenses);
router.get('/daily', validate({ query: dailyQuerySchema }), daily);

export default router;
