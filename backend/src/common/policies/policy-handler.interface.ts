import { ExecutionContext } from '@nestjs/common';

/**
 * The Policies layer sits above RolesGuard for authorization that depends on
 * *which* resource is being touched, not just *what role* the user holds —
 * e.g. "a Provider may edit this listing only if they own it." That can't be
 * expressed as a static @Roles() list because it depends on request params
 * and a database lookup. Each PolicyHandler is a small, independently
 * testable class; a route composes as many as it needs via @CheckPolicies().
 */
export interface PolicyHandler {
  handle(context: ExecutionContext): Promise<boolean> | boolean;
}

export type PolicyHandlerClass = new (...args: unknown[]) => PolicyHandler;
