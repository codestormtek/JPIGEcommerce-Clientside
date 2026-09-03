import { Request } from 'express';

// ─── Auth / JWT ───────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export interface JwtPayload {
  sub: string;       // SiteUser.id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Augmented Express Request with authenticated user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── API Response envelope ────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

