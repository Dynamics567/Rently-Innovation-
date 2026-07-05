import { SetMetadata } from '@nestjs/common';
import { PolicyHandlerClass } from '../policies/policy-handler.interface';

export const CHECK_POLICIES_KEY = 'check_policies';

/**
 * `@CheckPolicies(IsSelfOrAdminPolicy)` on a controller method — evaluated by
 * PoliciesGuard after RolesGuard passes. Multiple handlers all must pass
 * (AND semantics); a policy that needs OR semantics should express that
 * internally rather than composing across handlers.
 */
export const CheckPolicies = (...handlers: PolicyHandlerClass[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
