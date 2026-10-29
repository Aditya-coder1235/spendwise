import { z } from 'zod';
import { objectId, periodKey } from './schemas.js';
import { transactionQuerySchema } from './schemas.js';

export const idParamSchema = z.object({ id: objectId });

export const categoryQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
});

export { transactionQuerySchema, periodKey };
