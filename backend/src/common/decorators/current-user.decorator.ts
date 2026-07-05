import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '@modules/identity/strategies/jwt.strategy';

/**
 * `@CurrentUser() user: AuthenticatedUser` in a controller signature instead
 * of reaching into `req.user` — keeps controllers decoupled from Express's
 * request shape and gives us one place to change if the JWT payload shape
 * ever changes.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
