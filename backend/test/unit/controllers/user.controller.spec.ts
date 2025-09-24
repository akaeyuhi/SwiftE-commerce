import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from 'src/modules/user/user.controller';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { RoleDto } from 'src/modules/user/dto/role.dto';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { mockService } from 'test/unit/utils/test-helpers';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<Partial<UserService>>;

  beforeEach(async () => {
    service = mockService<UserService>([
      'create',
      'assignRole',
      'revokeRole',
      'createStore',
    ]);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: service }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => jest.clearAllMocks());

  it('register should call userService.create and return dto', async () => {
    const dto: CreateUserDto = {
      email: 'a@b.com',
      password: 'p',
      username: 'u',
    } as any;
    const out = { id: 'u1', email: dto.email } as any;
    (service.create as jest.Mock).mockResolvedValue(out);

    const res = await controller.register(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(out);
  });

  it('assignRole should call userService.assignRole with provided params', async () => {
    const roleDto: RoleDto = {
      roleName: 'STORE_ADMIN' as any,
      storeId: 's1',
    } as any;
    (service.assignRole as jest.Mock).mockResolvedValue({
      id: 'r1',
    } as any);

    const res = await controller.assignRole('u1', roleDto);
    expect(service.assignRole).toHaveBeenCalledWith(
      'u1',
      roleDto.roleName,
      roleDto.storeId
    );
    expect(res).toEqual({ id: 'r1' });
  });

  it('revokeStoreRole should call userService.revokeRole', async () => {
    const roleDto: RoleDto = {
      roleName: 'STORE_ADMIN' as any,
      storeId: 's1',
    } as any;
    (service.revokeRole as jest.Mock).mockResolvedValue(undefined);

    const res = await controller.revokeStoreRole('u1', roleDto);
    expect(service.revokeRole).toHaveBeenCalledWith(
      'u1',
      roleDto.roleName,
      roleDto.storeId
    );
    expect(res).toBeUndefined();
  });

  it('createStore should call userService.createStore', async () => {
    const dto: CreateStoreDto = { name: 'MyStore' } as any;
    const created = { id: 'store1', name: 'MyStore' } as any;
    (service.createStore as jest.Mock).mockResolvedValue(created);

    const res = await controller.createStore('owner1', dto);
    expect(service.createStore).toHaveBeenCalledWith('owner1', dto);
    expect(res).toEqual(created);
  });
});
