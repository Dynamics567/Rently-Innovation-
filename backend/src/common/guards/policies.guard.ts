import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { PolicyHandlerClass } from '../policies/policy-handler.interface';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-codes.enum';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerClasses =
      this.reflector.getAllAndOverride<PolicyHandlerClass[]>(CHECK_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    for (const HandlerClass of handlerClasses) {
      // `moduleRef.create` instantiates the class with its constructor
      // dependencies resolved from the DI container, without requiring the
      // policy to be registered as a provider on every module that uses it.
      const handler = await this.moduleRef.create(HandlerClass);
      const allowed = await handler.handle(context);
      if (!allowed) {
        throw DomainException.forbidden(
          ErrorCode.FORBIDDEN,
          'You do not have permission to perform this action on this resource.',
        );
      }
    }
    return true;
  }
}
