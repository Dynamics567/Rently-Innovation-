import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Structured request/response logging with latency. In production this
 * writes JSON (via nestjs-pino, wired in main.ts) so log lines are queryable
 * in Grafana Loki by requestId, route, status, and latency — not just
 * grep-able strings.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, requestId } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.logger.log(
            `[${requestId}] ${method} ${originalUrl} ${response.statusCode} +${Date.now() - start}ms`,
          );
        },
        error: (err) => {
          this.logger.warn(
            `[${requestId}] ${method} ${originalUrl} failed +${Date.now() - start}ms: ${err.message}`,
          );
        },
      }),
    );
  }
}
