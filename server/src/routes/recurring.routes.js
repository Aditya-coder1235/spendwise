import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRecurringSchema,
  updateRecurringSchema,
} from '../validators/schemas.js';
import { idParamSchema } from '../validators/query.schemas.js';
import {
  create,
  list,
  process,
  remove,
  update,
} from '../controllers/recurring.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/process', process);
router.route('/').get(list).post(validate({ body: createRecurringSchema }), create);
router
  .route('/:id')
  .put(validate({ params: idParamSchema, body: updateRecurringSchema }), update)
  .delete(validate({ params: idParamSchema }), remove);

export default router;
