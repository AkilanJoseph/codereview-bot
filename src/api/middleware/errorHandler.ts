import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../services/logger';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Prisma connection and query errors have these constructor names.
const PRISMA_ERROR_NAMES = new Set([
  'PrismaClientInitializationError',
  'PrismaClientKnownRequestError',
  'PrismaClientUnknownRequestError',
  'PrismaClientRustPanicError',
  'PrismaClientValidationError',
]);

// Prisma 7 adapter errors include this phrase in the message.
function isPrismaError(err: AppError): boolean {
  if (PRISMA_ERROR_NAMES.has(err.constructor.name)) return true;
  // Adapter-level connection failures surface as generic errors whose message
  // starts with "Invalid `prisma." or mentions the adapter.
  return /Invalid `prisma\.|PrismaClient|prisma\.\w+\.\w+\(\)/.test(err.message);
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Map Prisma errors to a 503 with a human-readable message.
  if (isPrismaError(err)) {
    logger.error('Database error', { name: err.constructor.name, message: err.message });
    res.status(503).json({
      data: null,
      meta: null,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is unavailable. Ensure PostgreSQL is running and DATABASE_URL is correct.',
      },
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error('Unhandled error', { code, message: err.message, stack: err.stack });
  }

  // Never expose stack traces or internal paths in production.
  const message =
    statusCode >= 500 && process.env['NODE_ENV'] === 'production'
      ? 'An internal error occurred'
      : err.message;

  res.status(statusCode).json({
    data: null,
    meta: null,
    error: { code, message },
  });
}
