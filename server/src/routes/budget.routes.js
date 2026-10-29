import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  budgetQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
} from '../validators/schemas.js';
import { idParamSchema } from '../validators/query.schemas.js';
import { create, list, remove, update } from '../controllers/budget.controller.js';

const router = Router();
router.use(requireAuth);

router
  .route('/')
  .get(validate({ query: budgetQuerySchema }), list)
  .post(validate({ body: createBudgetSchema }), create);

router
  .route('/:id')
  .put(validate({ params: idParamSchema, body: updateBudgetSchema }), update)
  .delete(validate({ params: idParamSchema }), remove);

export default router;
