import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/schemas.js';
import { categoryQuerySchema, idParamSchema } from '../validators/query.schemas.js';
import {
  create,
  list,
  remove,
  update,
} from '../controllers/category.controller.js';

const router = Router();
router.use(requireAuth);

router
  .route('/')
  .get(validate({ query: categoryQuerySchema }), list)
  .post(validate({ body: createCategorySchema }), create);

router
  .route('/:id')
  .put(validate({ params: idParamSchema, body: updateCategorySchema }), update)
  .delete(validate({ params: idParamSchema }), remove);

export default router;
