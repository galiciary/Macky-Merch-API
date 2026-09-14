import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

/** Runs when no route matched the request. */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error handler. Every route funnels failures here so that
 * error responses have one consistent shape across the whole API.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // express.json() throws a SyntaxError with a body property on bad JSON
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: { message: 'Malformed JSON in request body' },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Anything unrecognized is a bug: log it, return a generic 500
  console.error('Unexpected error:', err);
  res.status(500).json({ error: { message: 'Internal Server Error' } });
};