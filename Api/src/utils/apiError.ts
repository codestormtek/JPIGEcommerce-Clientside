export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // ─── Factory helpers ──────────────────────────────────────────────────────

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(404, `${resource} not found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, message, details);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }
}
