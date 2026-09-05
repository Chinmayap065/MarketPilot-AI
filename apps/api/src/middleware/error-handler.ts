import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class ApiError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, 'RESOURCE_NOT_FOUND', `Route not found: ${request.method} ${request.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const apiError = error instanceof ApiError
    ? error
    : error instanceof SyntaxError && 'body' in error
      ? new ApiError(400, 'INVALID_JSON', 'The request body contains invalid JSON')
    : error instanceof ZodError
      ? new ApiError(400, 'INVALID_REQUEST', 'The request parameters are invalid')
      : new ApiError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
  logger.error('API request failed', { method: request.method, path: request.path, code: apiError.code, error: error instanceof Error ? error.message : String(error) });
  response.status(apiError.statusCode).json({ error: { code: apiError.code, message: apiError.message } });
};
