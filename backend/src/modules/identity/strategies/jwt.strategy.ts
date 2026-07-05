import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthConfig } from '@config/configuration';
import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  roles: UserRole[];
}

/** Shape of `request.user` after JwtAuthGuard runs — see @CurrentUser(). */
export interface AuthenticatedUser {
  id: string;
  roles: UserRole[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<AuthConfig>('auth')!.accessSecret,
    });
  }

  // Passport calls this once the signature/expiry are already verified;
  // its return value becomes `request.user`. Kept intentionally minimal —
  // a full User fetch per request is unnecessary weight on the hot path,
  // Services fetch what they need using `.id` when they need more than
  // id/roles.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return { id: payload.sub, roles: payload.roles };
  }
}
