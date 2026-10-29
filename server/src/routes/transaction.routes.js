import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTransactionSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from '../validators/schemas.js';
import { idParamSchema } from '../validators/query.schemas.js';
import {
  create,
  getOne,
  list,
  remove,
  update,
} from '../controllers/transaction.controller.js';

const router = Router();
router.use(requireAuth);

router
  .route('/')
  .get(validate({ query: transactionQuerySchema }), list)
  .post(validate({ body: createTransactionSchema }), create);

router
  .route('/:id')
  .get(validate({ params: idParamSchema }), getOne)
  .put(validate({ params: idParamSchema, body: updateTransactionSchema }), update)
  .delete(validate({ params: idParamSchema }), remove);

export default router;
