import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { generateRefreshToken, hashToken } from './utils/token.util';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;

    // const { password: _, ...result } = user;
    const { ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const family = crypto.randomUUID();

    return this.issueTokenPair(user, family, meta);
  }

  async logout(rawToken: string) {
    const pepper = this.config.get<string>('JWT_REFRESH_SECRET_PEPPER')!;
    const tokenHash = hashToken(rawToken, pepper);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (stored) {
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revoked: true },
      });
    }
  }

  async refresh(rawToken: string, meta?: { userAgent?: string; ip?: string }) {
    const pepper = this.config.get<string>('JWT_REFRESH_SECRET_PEPPER')!;
    const tokenHash = hashToken(rawToken, pepper);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.revoked) {
      // Token reuse => the family is compromised. Kill all sessions in it.
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Session revoked due to token reuse');
    }

    // Rotate: revoke this one, issue a new pair in the same family
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.userService.findById(stored.userId);
    if (!user || user.deletedAt)
      throw new UnauthorizedException('User no longer active');

    return this.issueTokenPair(user, stored.family, meta);
  }

  async logoutAllSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async issueTokenPair(
    user: { id: string; displayName: string; role: string; email: string },
    family: string,
    meta?: { userAgent?: string; ip?: string },
  ) {
    const accessPayload = { sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(accessPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const rawRefreshToken = generateRefreshToken();
    const pepper = this.config.get<string>('JWT_REFRESH_SECRET_PEPPER')!;
    const tokenHash = hashToken(rawRefreshToken, pepper);
    const refreshTtlDays = Number(this.config.get<string>('REFRESH_TOKEN_TTL'));
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        family,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    return {
      access_token,
      refresh_token: rawRefreshToken,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
