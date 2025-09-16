import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../user/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenService } from 'src/modules/auth/modules/refresh-token/refresh-token.service';
import { Request } from 'express';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  id: string;
  email: string;
  sub?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService
  ) {}

  private async validateUser(
    email: string,
    password: string,
    user: any
  ): Promise<boolean> {
    if (!user) return false;
    const passwordCheck = await bcrypt.compare(password, user.passwordHash);
    return user.email === email && passwordCheck;
  }

  async doesUserExists(checkDto: CreateUserDto | LoginDto): Promise<boolean> {
    const user = await this.userService.findByEmail(checkDto.email);
    return !!user;
  }

  async login(dto: LoginDto, req?: Request) {
    const user = await this.userService.findUserWithPassword(dto.email);
    if (!user)
      throw new NotFoundException(`User with such email doesn't exist`);
    if (!(await this.validateUser(dto.email, dto.password, user))) {
      throw new UnauthorizedException('Invalid password or email');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      sub: user.id,
    };
    const tokens = await this.getTokens(payload, req);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        siteRole: user.siteRole,
      },
    };
  }

  async register(createUserDto: CreateUserDto, req?: Request) {
    const check = await this.doesUserExists(createUserDto);
    if (check) throw new ConflictException('Such user already exists');
    await this.userService.create(createUserDto);
    return this.login(
      { email: createUserDto.email, password: createUserDto.password },
      req
    );
  }

  /**
   * Rotate refresh tokens: check token belongs to user and not banned, delete old token,
   * create new one.
   * Returns { accessToken, refreshToken, csrfToken } - controller should set cookies.
   */
  async refreshAccessToken(payload: JwtPayload, token: string, req?: Request) {
    const tokenRecord = await this.refreshTokenService.findByToken(token);
    if (
      !tokenRecord ||
      tokenRecord.isBanned ||
      tokenRecord.user.id !== payload.id
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // remove old token record (rotation)
    await this.refreshTokenService.removeByValue(token);

    // issue new tokens
    return await this.getTokens(payload, req);
  }

  async banRefresh(token: string) {
    return this.refreshTokenService.toggleBan(token);
  }

  private async getTokens(
    payload: JwtPayload,
    req?: Request
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    // create csrf token for double-submit
    const csrfToken = cryptoRandomHex(16);

    // capture device info from request if present
    const ip = req
      ? req.ip ||
        (req.headers['x-forwarded-for'] as string) ||
        req.connection?.remoteAddress
      : undefined;
    const userAgent = req ? (req.headers['user-agent'] as string) : undefined;
    const deviceId = req ? (req.headers['x-device-id'] as string) : undefined;

    // persist refresh token (hashed) with metadata
    await this.refreshTokenService.create({
      userId: payload.id,
      token: refreshToken,
      deviceId,
      ip,
      userAgent,
    });

    return { accessToken, refreshToken, csrfToken };
  }
}

// helper
function cryptoRandomHex(length = 16) {
  return randomBytes(length).toString('hex');
}
