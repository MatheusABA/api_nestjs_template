import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refresh_token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refresh_token);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    await this.authService.logoutAllSessions(req.user.userId);
    return { success: true };
  }
}
