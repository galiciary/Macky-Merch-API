import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type ValidationSource = 'body' | 'params' | 'query';

/** Turns Zod's issue list into a flat, client-friendly array. */
function formatIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(body)',
    message: issue.message,
  }));
}

/**
 * Validates one part of the request against a Zod schema.
 *
 * The parsed result is stored on res.locals instead of written back onto
 * the request because in Express 5 req.query is a read-only getter and
 * assigning to it throws.
 */
export function validate(
  schema: ZodType,
  source: ValidationSource = 'body'
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(ApiError.badRequest('Validation failed', formatIssues(result.error)));
      return;
    }

    res.locals[source] = result.data;
    next();
  };
}