import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Returns Express middleware that validates req[target] against a Zod schema.
 * On success the parsed (and coerced) value replaces the original.
 * On failure it passes a ZodError to the error middleware.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace with the parsed value so controllers get typed + coerced data
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}

