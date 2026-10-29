import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportQuerySchema, transactionQuerySchema } from '../validators/schemas.js';
import { exportCsv, summary } from '../controllers/report.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', validate({ query: reportQuerySchema }), summary);
router.get('/export', validate({ query: transactionQuerySchema }), exportCsv);

export default router;
