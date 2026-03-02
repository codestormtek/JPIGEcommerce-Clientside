import { Response } from 'express';
import { PaginatedResult } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
): void {
  res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendPaginated<T>(res: Response, result: PaginatedResult<T>): void {
  res.status(200).json({
    success: true,
    data: result.data,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}
