import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

declare module 'express' {
  interface Request {
    requestId: string;
  }
}

/**
 * Stamps every inbound request with a correlation id, echoed back as
 * `X-Request-Id`. This is what lets a single log line in Grafana/Loki be
 * traced across the logging interceptor, the exception filter, and any
 * downstream service call for that same request — see docs/ARCHITECTURE.md
 * observability notes.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    req.requestId = typeof incoming === 'string' ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  }
}
