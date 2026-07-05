import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-codes.enum';
import { IDEMPOTENCY_STORE, IdempotencyStore } from './idempotency-store.interface';

/**
 * Backs the `Idempotency-Key` contract from docs/API_DESIGN.md. First call
 * with a given key executes normally and its response is cached; any retry
 * with the same key returns the cached response instead of re-running the
 * handler. `IdempotencyStore` is an interface (see idempotency-store.interface.ts)
 * so the MVP in-memory implementation swaps for a Redis-backed one in
 * production without this interceptor changing.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const requiresIdempotency = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresIdempotency) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const key = request.headers['idempotency-key'];
    if (!key) {
      throw DomainException.unprocessable(
        ErrorCode.IDEMPOTENCY_KEY_REQUIRED,
        'This request requires an Idempotency-Key header.',
      );
    }

    const cacheKey = `${request.user?.id ?? 'anonymous'}:${request.method}:${request.originalUrl}:${key}`;

    return from(this.store.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          return of(cached);
        }
        return next.handle().pipe(
          tap((response) => {
            // Fire-and-forget: caching failure should not fail the original request.
            void this.store.set(cacheKey, response, 24 * 60 * 60);
          }),
        );
      }),
    );
  }
}
