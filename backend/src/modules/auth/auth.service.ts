import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';

export interface JwtPayload {
  id: string;
  email: string;
  // you can add other claims as needed
  sub?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
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

  async login(dto: LoginDto) {
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
    const tokens = await this.getTokens(payload);

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

  async register(createUserDto: CreateUserDto) {
    const check = await this.doesUserExists(createUserDto);
    if (check) throw new ConflictException('Such user already exists');
    await this.userService.create(createUserDto);
    // return tokens (login)
    return this.login({
      email: createUserDto.email,
      password: createUserDto.password,
    });
  }

  async refreshAccessToken(payload: JwtPayload, token: string) {
    // check that the token exists and is not banned and belongs to the user
    const tokenRecord = await this.refreshTokenService.findByToken(token);
    if (
      !tokenRecord ||
      tokenRecord.isBanned ||
      tokenRecord.user.id !== payload.id
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate refresh token: remove old one, issue new
    await this.refreshTokenService.removeByValue(token);

    const { accessToken, refreshToken } = await this.getTokens(payload);
    return { accessToken, refreshToken };
  }

  async banRefresh(token: string) {
    return this.refreshTokenService.toggleBan(token);
  }

  private async getTokens(
    payload: JwtPayload
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    // persist refreshToken hashed
    await this.refreshTokenService.create({
      userId: payload.id,
      token: refreshToken,
    });

    return { accessToken, refreshToken };
  }
}
