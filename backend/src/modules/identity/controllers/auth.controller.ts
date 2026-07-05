import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { AuthService } from '../services/auth.service';
import { OtpService } from '../services/otp.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RequestOtpDto, VerifyOtpDto } from '../dto/otp.dto';

/**
 * Thin by design: a controller's only job is HTTP concerns (route, status
 * code, DTO binding) — every line of actual logic lives in a Service. This
 * is what keeps the layered architecture honest; a controller that grows a
 * conditional beyond routing is a signal that logic leaked out of the
 * Service layer.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const { user, tokens } = await this.authService.signup(dto);
    return { user, ...tokens };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.authService.login(dto);
    return { user, ...tokens };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    // Public by design — the whole point of this route is that the caller's
    // access token has expired. The raw refresh token is itself the
    // credential; see TokenService.findUserIdByRefreshToken.
    return this.authService.refresh(dto.refreshToken);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.id);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('otp/request')
  async requestOtp(@Body() dto: RequestOtpDto) {
    await this.otpService.requestOtp(dto.phone);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto, @CurrentUser() user: AuthenticatedUser) {
    await this.authService.verifyPhoneOtp(user.id, dto.phone, dto.code);
  }
}
