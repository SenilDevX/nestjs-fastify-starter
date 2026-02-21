import {
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
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
      createdAt: (user as unknown as { createdAt: Date }).createdAt,
    };
  }

  private async generateTokenPair(userId: string, email: string) {
    const tokenId = randomUUID();
    const version = await this.getRefreshTokenVersion(userId);

    const accessPayload: JwtPayload = { sub: userId, email };
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
}
