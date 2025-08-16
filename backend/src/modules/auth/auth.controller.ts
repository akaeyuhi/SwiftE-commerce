import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

const REFRESH_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const { accessToken, refreshToken, csrfToken, user } =
      await this.authService.register(dto, req);
    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);
    // return accessToken in body and user
    return res.json({ accessToken, user });
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const { accessToken, refreshToken, csrfToken, user } =
      await this.authService.login(dto, req);
    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);
    return res.json({ accessToken, user });
  }

  /**
   * Refresh endpoint:
   * - Uses `jwt-refresh` strategy to validate refresh token and attach req.user
   * - Additionally requires double-submit CSRF header matching cookie
   */
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response) {
    // CSRF double-submit check: header X-CSRF-Token must equal cookie XSRF-TOKEN
    const csrfHeader =
      req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    const csrfCookie = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : undefined;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    // raw refresh token must be in cookie or in request (extract same way as strategy)
    const rawRefreshToken = extractRefreshTokenFromReq(req);
    const payload = {
      id: (req.user as any).id,
      email: (req.user as any).email,
      sub: (req.user as any).id,
    };

    const { accessToken, refreshToken, csrfToken } =
      await this.authService.refreshAccessToken(payload, rawRefreshToken!, req);
    // set new cookies
    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);

    return res.json({ accessToken });
  }

  /**
   * Logout: ban/remove refresh token and clear cookies.
   */
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: RefreshDto
  ) {
    // prefer cookie; fallback to body
    const token = extractRefreshTokenFromReq(req) || dto?.refreshToken;
    if (token) {
      await this.authService.banRefresh(token);
    }
    // clear cookies
    clearAuthCookies(res);
    return res.json({ ok: true });
  }
}

/* Cookie helpers */

function setRefreshCookie(res: Response, refreshToken: string) {
  const secure = (process.env.COOKIE_SECURE || 'true') === 'true';
  // cookie expiry: reflect the refresh token TTL in ms if desired (7 days)
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge,
  });
}

function setCsrfCookie(res: Response, csrfToken: string) {
  const secure = (process.env.COOKIE_SECURE || 'true') === 'true';
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // must be accessible to JS for double-submit
    secure,
    sameSite: 'lax',
    path: '/', // app JS can read it
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

/** Extract refresh token using same priority as strategy */
function extractRefreshTokenFromReq(req: Request): string | undefined {
  if (!req) return undefined;
  if (req.cookies && req.cookies[REFRESH_COOKIE_NAME])
    return req.cookies[REFRESH_COOKIE_NAME];
  if (req.body && (req.body as any).refreshToken)
    return (req.body as any).refreshToken;
  if (req.headers['x-refresh-token'])
    return req.headers['x-refresh-token'] as string;
  const auth = req.headers['authorization'] as string;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}
