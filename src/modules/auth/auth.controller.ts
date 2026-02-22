import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as Fastify from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowPreTwoFactor } from '../../common/decorators/pre-two-factor.decorator';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setTempTokenCookie,
  clearAuthCookies,
} from '../../common/utils/cookie.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: Fastify.FastifyReply,
  ) {
    const result = await this.authService.login(dto);

    if ('requiresTwoFactor' in result) {
      setTempTokenCookie(reply, result.tempToken);
      return { requiresTwoFactor: true };
    }

    setAccessTokenCookie(reply, result.accessToken);
    setRefreshTokenCookie(reply, result.refreshToken);
    return { message: 'Logged in successfully' };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Fastify.FastifyRequest,
    @Res({ passthrough: true }) reply: Fastify.FastifyReply,
  ) {
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const result = await this.authService.refresh(refreshToken);

    setAccessTokenCookie(reply, result.accessToken);
    setRefreshTokenCookie(reply, result.refreshToken);

    return { message: 'Tokens refreshed' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @ApiCookieAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() request: Fastify.FastifyRequest,
    @Res({ passthrough: true }) reply: Fastify.FastifyReply,
  ) {
    const refreshToken = request.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }

    clearAuthCookies(reply);
  }

  @ApiCookieAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) reply: Fastify.FastifyReply,
  ) {
    await this.authService.logoutAll(userId);
    clearAuthCookies(reply);
  }

  @ApiCookieAuth()
  @Get('me')
  getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  changeEmail(@CurrentUser('sub') userId: string, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(userId, dto.newEmail, dto.password);
  }

  @ApiCookieAuth()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  setupTwoFactor(@CurrentUser('sub') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  confirmTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.authService.confirmTwoFactor(userId, dto.token);
  }

  @AllowPreTwoFactor()
  @ApiCookieAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/authenticate')
  @HttpCode(HttpStatus.OK)
  async authenticateTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) reply: Fastify.FastifyReply,
  ) {
    const result = await this.authService.authenticateTwoFactor(
      userId,
      dto.token,
    );

    reply.clearCookie('temp_token', { path: '/auth/2fa' });
    setAccessTokenCookie(reply, result.accessToken);
    setRefreshTokenCookie(reply, result.refreshToken);

    return { message: 'Two-factor authentication verified' };
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() dto: DisableTwoFactorDto,
  ) {
    return this.authService.disableTwoFactor(userId, dto.password, dto.token);
  }
}
