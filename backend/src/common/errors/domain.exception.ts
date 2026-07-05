import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';

/**
 * The one exception type business logic should throw. It carries a stable
 * `code` (see ErrorCode) alongside the HTTP status, so `AllExceptionsFilter`
 * can render the `{ error: { code, message, details } }` envelope without
 * every Service needing to know about HTTP at all — a Service throws
 * `DomainException.conflict(...)`, it doesn't construct an HTTP response.
 */
export class DomainException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }

  static notFound(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new DomainException(code, message, HttpStatus.NOT_FOUND, details);
  }

  static conflict(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new DomainException(code, message, HttpStatus.CONFLICT, details);
  }

  static forbidden(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new DomainException(code, message, HttpStatus.FORBIDDEN, details);
  }

  static unauthorized(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new DomainException(code, message, HttpStatus.UNAUTHORIZED, details);
  }

  static unprocessable(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new DomainException(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}
