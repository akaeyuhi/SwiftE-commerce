import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from 'src/modules/user/user.controller';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { RoleDto } from 'src/modules/user/dto/role.dto';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { jest } from '@jest/globals';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { Store } from 'src/entities/store/store.entity';

describe('UserController', () => {
  let controller: UserController;
  let service: Partial<MockedMethods<UserService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  beforeEach(async () => {
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    service = createServiceMock<UserService>([
      'create',
      'assignStoreRole',
      'revokeStoreRole',
      'createStore',
    ]);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        {
          provide: JwtAuthGuard,
          useValue: guardMock,
        },
        {
          provide: StoreRolesGuard,
          useValue: guardMock,
        },
        {
          provide: AdminGuard,
          useValue: guardMock,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => jest.clearAllMocks());

  it('register should call userService.create and return dto', async () => {
    const dto: CreateUserDto = {
      email: 'a@b.com',
      password: 'p',
      firstName: 'f',
      lastName: 'f',
    };
    const out = { id: 'u1', email: dto.email } as any;
    service.create!.mockResolvedValue(out as never);

    const res = await controller.register(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(out);
  });

  it('assignRole should call userService.assignRole with provided params', async () => {
    const roleDto: RoleDto = {
      roleName: StoreRoles.ADMIN,
      storeId: 's1',
      assignedBy: 'a1',
    };
    service.assignStoreRole!.mockResolvedValue({
      id: 'r1',
    } as UserRole);

    const res = await controller.assignRole('u1', roleDto);
    expect(service.assignStoreRole).toHaveBeenCalledWith(
      'u1',
      roleDto.roleName,
      roleDto.storeId
    );
    expect(res).toEqual({ id: 'r1' });
  });

  it('revokeStoreRole should call userService.revokeRole', async () => {
    const roleDto: RoleDto = {
      roleName: StoreRoles.ADMIN,
      storeId: 's1',
    };
    service.revokeStoreRole!.mockResolvedValue(undefined);

    const res = await controller.revokeStoreRole('u1', roleDto);
    expect(service.revokeStoreRole).toHaveBeenCalledWith(
      'u1',
      roleDto.roleName,
      roleDto.storeId
    );
    expect(res).toBeUndefined();
  });

  it('createStore should call userService.createStore', async () => {
    const dto: CreateStoreDto = { name: 'MyStore' } as CreateStoreDto;
    const created = { id: 'store1', name: 'MyStore' } as Store;
    service.createStore!.mockResolvedValue(created);

    const res = await controller.createStore('owner1', dto);
    expect(service.createStore).toHaveBeenCalledWith('owner1', dto);
    expect(res).toEqual(created);
  });
});
