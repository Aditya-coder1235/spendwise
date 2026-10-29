import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.path} was not found.`, 'NOT_FOUND'));
}

export function errorHandler(error, req, res, _next) {
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Something went wrong.';
  let details = error.details;

  if (error.name === 'ValidationError') {
    status = 422;
    code = 'VALIDATION_FAILED';
    message = 'Please check the highlighted fields and try again.';
    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (error.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = 'The requested record could not be found.';
  } else if (error.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    const field = Object.keys(error.keyPattern || {})[0];
    message =
      field === 'category'
        ? 'A budget for this category and month already exists.'
        : 'A record with those details already exists.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'The request body contains invalid JSON.';
  }

  if (status >= 500) {
    // Request bodies, cookies and tokens are intentionally never logged.
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error.stack || error);
    message = env.isProduction ? 'Something went wrong. Please try again later.' : message;
    details = undefined;
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
