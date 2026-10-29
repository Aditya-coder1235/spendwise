import { ApiError } from '../utils/api-error.js';

export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    try {
      for (const key of ['params', 'query', 'body']) {
        if (!schemas[key]) continue;
        const result = schemas[key].safeParse(req[key] ?? {});
        if (!result.success) {
          const details = result.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'request',
            message: issue.message,
          }));
          throw new ApiError(422, 'Please check the highlighted fields and try again.', 'VALIDATION_FAILED', details);
        }
        validated[key] = result.data;
      }
    } catch (error) {
      return next(error);
    }
    req.validated = validated;
    return next();
  };
}
