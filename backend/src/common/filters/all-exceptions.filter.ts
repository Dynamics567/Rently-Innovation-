import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-codes.enum';

interface ErrorBody {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Single place where an exception becomes an HTTP response. This is what
 * guarantees every error — a validation failure, a thrown DomainException,
 * an unhandled Postgres constraint violation, a truly unexpected bug — comes
 * back to the client in the same `{ error: { code, message, details } }`
 * shape defined in docs/API_DESIGN.md. No controller ever formats an error
 * response by hand.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} [${body.code}] ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} [${body.code}] ${body.message}`);
    }

    response.status(status).json({ error: body });
  }

  private resolve(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof DomainException) {
      const response = exception.getResponse() as ErrorBody;
      return { status: exception.getStatus(), body: response };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      // Nest's built-in ValidationPipe throws a BadRequestException whose
      // response body is { message: string[] } — normalize it to our envelope.
      const message =
        typeof response === 'string'
          ? response
          : Array.isArray((response as any)?.message)
            ? (response as any).message.join('; ')
            : ((response as any)?.message ?? exception.message);
      return {
        status,
        body: { code: status === 400 ? ErrorCode.VALIDATION_FAILED : ErrorCode.INTERNAL_ERROR, message },
      };
    }

    // Postgres EXCLUDE/UNIQUE constraint violations that slip through service-level
    // pre-checks (the race window docs/ARCHITECTURE.md §4.1 describes) land here.
    if (exception instanceof QueryFailedError) {
      const pgError = exception as QueryFailedError & { code?: string };
      if (pgError.code === '23P01' || pgError.code === '23505') {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            code: ErrorCode.BOOKING_DATES_UNAVAILABLE,
            message: 'This resource was just modified by a concurrent request. Please retry.',
          },
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred.' },
    };
  }
}
