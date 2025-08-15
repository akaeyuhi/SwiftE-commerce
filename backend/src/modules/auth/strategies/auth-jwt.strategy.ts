import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET')!,
    });
  }

  async validate(payload: any) {
    // payload contains { id, email, sub }
    const user = await this.userService.findOneWithRelations(payload.id);
    if (!user) throw new UnauthorizedException();
    // attach computed permissions & storeRole arrays if needed in user object
    // e.g., user.permissions = computePermissionsFromRoles(user.roles)
    return user;
  }
}
