import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { UserService } from 'src/modules/user/user.service';
import { Request } from 'express';

const extractors = [
  // body field extractor
  (req: Request) => {
    if (req && req.body && (req.body as any).refreshToken) {
      return (req.body as any).refreshToken;
    }
    return null;
  },
  // cookie extractor
  (req: Request) => {
    if (req && (req as any).cookies && (req as any).cookies.refreshToken) {
      return (req as any).cookies.refreshToken;
    }
    return null;
  },
  // x-refresh-token header
  (req: Request) => {
    const header =
      req && (req.headers['x-refresh-token'] || req.headers['X-Refresh-Token']);
    if (typeof header === 'string') return header;
    return null;
  },
  // fallback to Authorization header Bearer
  ExtractJwt.fromAuthHeaderAsBearerToken(),
];

/**
 * RefreshTokenStrategy
 * - Token extraction: body.refreshToken | cookie.refreshToken | header x-refresh-token | Authorization Bearer
 * - Validates the refresh token record (exists, not banned) and that it belongs to the user in payload.
 *
 * Register it as provider in AuthModule and use AuthGuard('jwt-refresh') on refresh endpoints if desired.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(
    private config: ConfigService,
    private refreshTokenService: RefreshTokenService,
    private userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors(extractors),
      secretOrKey:
        config.get<string>('JWT_REFRESH_SECRET') ||
        config.get<string>('JWT_SECRET')!,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  /**
   * validate is called after the token is decoded successfully.
   * We still need to ensure the token is present (extracted) and exists in DB + not banned,
   * and belongs to the same user id as in the payload.
   */
  async validate(req: Request, payload: any) {
    // Extract token raw value again (safer to reuse same logic)
    const token = this.extractTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // find stored (hashed) token record
    const tokenRecord = await this.refreshTokenService.findByToken(token);
    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token not found');
    }
    if (tokenRecord.isBanned) {
      throw new UnauthorizedException('Refresh token is banned');
    }

    // payload.sub or payload.id should contain user id depending on your JWT payload shape
    const userIdFromPayload = payload?.sub ?? payload?.id;
    if (!userIdFromPayload) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (tokenRecord.user?.id !== userIdFromPayload) {
      // token doesn't belong to this user
      throw new UnauthorizedException('Refresh token does not match user');
    }

    // load the full user with relations (roles, userRoles etc.)
    const user = await this.userService.findOneWithRelations(userIdFromPayload);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // remove sensitive fields before attaching to request
    if ((user as any).passwordHash) {
      delete (user as any).passwordHash;
    }

    // Optionally attach tokenRecord or raw token to the returned user object (if you need it later)
    // (user as any).__refreshToken = token;

    return user; // attached as req.user by Nest/Passport
  }

  private extractTokenFromRequest(req: Request): string | null {
    if (!req) return null;
    // body
    if ((req as any).body && (req as any).body.refreshToken)
      return (req as any).body.refreshToken;
    // cookie
    if ((req as any).cookies && (req as any).cookies.refreshToken)
      return (req as any).cookies.refreshToken;
    // x-refresh-token header
    const header =
      req.headers['x-refresh-token'] || req.headers['X-Refresh-Token'];
    if (typeof header === 'string' && header.length > 0) return header;
    // Authorization Bearer
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (typeof auth === 'string') {
      if (auth.startsWith('Bearer ')) return auth.slice(7);
      return auth;
    }
    return null;
  }
}
