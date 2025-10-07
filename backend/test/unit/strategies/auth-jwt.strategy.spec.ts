import { Test, TestingModule } from '@nestjs/testing';
import { AuthJwtStrategy } from 'src/modules/auth/strategies/auth-jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/user.service';
import { UnauthorizedException } from '@nestjs/common';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { User } from 'src/entities/user/user.entity';

describe('AuthJwtStrategy', () => {
  let strategy: AuthJwtStrategy;
  let config: Partial<MockedMethods<ConfigService>>;
  let userSvc: Partial<MockedMethods<UserService>>;

  const payload = { id: 'u1', email: 'e', sub: 'u1' };

  beforeEach(async () => {
    config = createMock<ConfigService>(['get']);
    config.get!.mockReturnValue('secret');
    userSvc = createMock<UserService>(['findOneWithRelations']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthJwtStrategy,
        { provide: ConfigService, useValue: config },
        { provide: UserService, useValue: userSvc },
      ],
    }).compile();

    strategy = module.get(AuthJwtStrategy);
  });

  it('validate returns user when found', async () => {
    const user = { id: 'u1' };
    userSvc.findOneWithRelations!.mockResolvedValue(user as any);

    const result = await strategy.validate(payload);
    expect(userSvc.findOneWithRelations).toHaveBeenCalledWith('u1');
    expect(result).toEqual(user);
  });

  it('throws UnauthorizedException when user not found', async () => {
    userSvc.findOneWithRelations!.mockResolvedValue(null as unknown as User);
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException
    );
  });
});
