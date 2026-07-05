import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Wraps every successful response in a consistent `{ data, meta }` envelope,
 * mirroring the error envelope from AllExceptionsFilter. A controller
 * returns the raw domain object (or `{ data, meta }` for paginated
 * endpoints) and never worries about response shape — one interceptor keeps
 * every endpoint on the same contract.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return result as ApiResponse<T>;
        }
        return { data: result };
      }),
    );
  }
}
