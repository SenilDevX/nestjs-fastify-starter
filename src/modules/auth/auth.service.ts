import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { generateSecret, generateURI, verify as verifyOtp } from 'otplib';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtPayload } from '../../common/types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const TEMP_TOKEN_TTL = '5m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const APP_NAME = 'GPMS Todo';
const OTP_WINDOW = 30;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create(dto.email, hashedPassword);

    return {
      id: user._id.toString(),
      email: user.email,
    };
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    const user = await this.usersService.create(dto.email, hashedPassword, {
      mustChangePassword: true,
      mustSetupTwoFactor: true,
    });

    await this.mailService.sendWelcomeEmail(dto.email, tempPassword);

    return {
      id: user._id.toString(),
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isTwoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          twoFactorVerified: false,
        } as JwtPayload,
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: TEMP_TOKEN_TTL,
        },
      );

      return { requiresTwoFactor: true, tempToken };
    }

    return this.generateTokenPair(user._id.toString(), user.email);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; tokenId: string; version: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const currentVersion = await this.getRefreshTokenVersion(payload.sub);
    if (payload.version !== currentVersion) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const stored = await this.cache.get(
      `refresh_token:${payload.sub}:${payload.tokenId}`,
    );
    if (!stored) throw new UnauthorizedException('Refresh token revoked');

    await this.cache.del(`refresh_token:${payload.sub}:${payload.tokenId}`);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    return this.generateTokenPair(user._id.toString(), user.email);
  }

  async logout(userId: string, refreshToken: string) {
    let payload: { sub: string; tokenId: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return;
    }

    if (payload.sub === userId) {
      await this.cache.del(`refresh_token:${payload.sub}:${payload.tokenId}`);
    }
  }

  async logoutAll(userId: string) {
    const currentVersion = await this.getRefreshTokenVersion(userId);
    await this.cache.set(
      `refresh_token_version:${userId}`,
      currentVersion + 1,
      REFRESH_TOKEN_TTL_MS,
    );
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user._id.toString(),
      email: user.email,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      mustSetupTwoFactor: user.mustSetupTwoFactor,
      mustChangePassword: user.mustChangePassword,
      createdAt: (user as unknown as { createdAt: Date }).createdAt,
    };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isTwoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    const secret = generateSecret();
    const otpauthUri = generateURI({
      issuer: APP_NAME,
      label: user.email,
      secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUri);

    await this.usersService.updateById(userId, { twoFactorTempSecret: secret });

    return { qrCodeUrl, secret };
  }

  async confirmTwoFactor(userId: string, token: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isTwoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }
    if (!user.twoFactorTempSecret) {
      throw new BadRequestException('Call /auth/2fa/setup first');
    }

    const result = await verifyOtp({
      token,
      secret: user.twoFactorTempSecret,
      epochTolerance: OTP_WINDOW,
    });
    if (!result.valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.usersService.updateById(userId, {
      isTwoFactorEnabled: true,
      twoFactorSecret: user.twoFactorTempSecret,
      twoFactorTempSecret: null,
      ...(user.mustSetupTwoFactor && { mustSetupTwoFactor: false }),
    });

    return { message: 'Two-factor authentication enabled' };
  }

  async authenticateTwoFactor(userId: string, token: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const result = await verifyOtp({
      token,
      secret: user.twoFactorSecret,
      epochTolerance: OTP_WINDOW,
    });
    if (!result.valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    return this.generateTokenPair(user._id.toString(), user.email);
  }

  async disableTwoFactor(userId: string, password: string, token: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const result = await verifyOtp({
      token,
      secret: user.twoFactorSecret,
      epochTolerance: OTP_WINDOW,
    });
    if (!result.valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.usersService.updateById(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
    });

    return { message: 'Two-factor authentication disabled' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');

      await this.usersService.updateById(user._id.toString(), {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      });

      await this.mailService.sendPasswordReset(user.email, rawToken);
    }

    return {
      message: 'If that email is registered, a reset link has been sent',
    };
  }

  async resetPassword(token: string, password: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await this.usersService.updateById(user._id.toString(), {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    await this.logoutAll(user._id.toString());

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const wasOnboarding = user.mustChangePassword;
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.updateById(userId, {
      password: hashedPassword,
      mustChangePassword: false,
    });

    if (!wasOnboarding) {
      await this.logoutAll(userId);
    }

    return { message: 'Password changed successfully' };
  }

  async changeEmail(userId: string, newEmail: string, password: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const existing = await this.usersService.findByEmail(newEmail);
    if (existing) throw new ConflictException('Email already in use');

    await this.usersService.updateById(userId, { email: newEmail });

    await this.logoutAll(userId);

    return { message: 'Email updated successfully' };
  }

  private async generateTokenPair(userId: string, email: string) {
    const tokenId = randomUUID();
    const version = await this.getRefreshTokenVersion(userId);

    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      twoFactorVerified: true,
    };
    const refreshPayload = { sub: userId, tokenId, version };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL,
      }),
    ]);

    await this.cache.set(
      `refresh_token:${userId}:${tokenId}`,
      '1',
      REFRESH_TOKEN_TTL_MS,
    );

    return { accessToken, refreshToken };
  }

  private async getRefreshTokenVersion(userId: string): Promise<number> {
    return (
      (await this.cache.get<number>(`refresh_token_version:${userId}`)) ?? 0
    );
  }

  private generateTempPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    const bytes = randomBytes(16);
    const chars = [
      upper[bytes[0] % upper.length],
      lower[bytes[1] % lower.length],
      digits[bytes[2] % digits.length],
      special[bytes[3] % special.length],
    ];

    for (let i = 4; i < 16; i++) {
      chars.push(all[bytes[i] % all.length]);
    }

    // Shuffle using remaining entropy
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomBytes(1)[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
