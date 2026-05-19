import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, PublicUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SESSION_COOKIE_NAME } from './jwt.strategy';

const ONE_HOUR_MS = 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ONE_HOUR_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { access_token, user } = await this.auth.login(
      body.email,
      body.password,
    );
    res.cookie(SESSION_COOKIE_NAME, access_token, cookieOptions());
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request): Promise<PublicUser> {
    const principal = (
      req as Request & {
        user?: { userId: string; organizationId: string };
      }
    ).user;
    if (!principal) {
      throw new NotFoundException('No active session');
    }
    const user = await this.auth.me(
      principal.userId,
      principal.organizationId,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
