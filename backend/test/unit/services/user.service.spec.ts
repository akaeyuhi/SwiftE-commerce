import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/modules/user/user.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserRoleService } from 'src/modules/user/user-role/user-role.service';
import { StoreService } from 'src/modules/store/store.service';
import { UserMapper } from 'src/modules/user/user.mapper';
import * as bcrypt from 'bcrypt';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import {
  createMapperMock,
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { User } from 'src/entities/user/user.entity';
import { UserDto } from 'src/modules/user/dto/user.dto';
import { DeleteResult } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepo: Partial<MockedMethods<UserRepository>>;
  let userRoleService: Partial<MockedMethods<UserRoleService>>;
  let storeService: Partial<MockedMethods<StoreService>>;
  let mapper: Partial<MockedMethods<UserMapper>>;

  beforeEach(async () => {
    userRepo = createRepositoryMock<UserRepository>([
      'findByEmail',
      'save',
      'findOneBy',
      'getUserWithPassword',
      'findOneWithRelations',
      'addRoleToUser',
      'removeRoleFromUser',
    ]);

    userRoleService = createServiceMock<UserRoleService>([
      'findByStoreUser',
      'create',
    ]);

    storeService = createServiceMock<StoreService>(['getEntityById', 'create']);

    mapper = createMapperMock<UserMapper>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepo },
        { provide: UserRoleService, useValue: userRoleService },
        { provide: StoreService, useValue: storeService },
        { provide: UserMapper, useValue: mapper },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a user when email not used', async () => {
      const dto = {
        email: 'a@b.com',
        password: 'pass',
      } as CreateUserDto;

      userRepo.findByEmail!.mockResolvedValue(null);
      const entity = {
        email: dto.email,
        password: dto.password,
      } as unknown as User;
      mapper.toEntity!.mockReturnValue(entity);
      const saved = { ...entity, id: 'u1', passwordHash: 'h' };
      userRepo.save!.mockResolvedValue(saved);
      mapper.toDto!.mockReturnValue({
        id: 'u1',
        email: dto.email,
      } as UserDto);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-pass' as never);

      const res = await service.create(dto);

      expect(userRepo.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(mapper.toEntity).toHaveBeenCalledWith(dto);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(userRepo.save).toHaveBeenCalled();
      expect(mapper.toDto).toHaveBeenCalledWith(saved);
      expect(res).toEqual({ id: 'u1', email: dto.email });
    });

    it('throws when email already used', async () => {
      const dto = { email: 'x@x.com', password: 'p' } as CreateUserDto;
      userRepo.findByEmail!.mockResolvedValue({
        id: 'exists',
      } as User);
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(userRepo.findByEmail).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('update', () => {
    it('updates user and hashes new password', async () => {
      const dto = {
        password: 'newpass',
        email: 'newname@email',
      } as CreateUserDto;
      const existing = {
        id: 'u1',
        email: 'old',
        passwordHash: 'old',
      } as unknown as User;

      userRepo.findOneBy!.mockResolvedValue(existing);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);

      // emulate save returning the updated entity
      userRepo.save!.mockImplementation(async (u) => ({ ...u }) as any);

      mapper.toDto!.mockImplementation(
        (u) =>
          ({
            id: u.id,
            email: u.email,
          }) as any
      );

      const res = await service.update('u1', dto);

      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(userRepo.save).toHaveBeenCalled();
      expect(res).toEqual({ id: existing.id, email: 'newname@email' });
    });

    it('throws when user not found', async () => {
      userRepo.findOneBy!.mockResolvedValue(null);
      await expect(service.update('no', {} as any)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByEmail', () => {
    it('returns dto when found', async () => {
      const user = { id: 'u1', email: 'a@b' } as User;
      userRepo.findOneBy!.mockResolvedValue(user);
      mapper.toDto!.mockReturnValue({ id: 'u1', email: 'a@b' } as UserDto);

      const res = await service.findByEmail('a@b');

      expect(userRepo.findOneBy).toHaveBeenCalledWith({ email: 'a@b' });
      expect(res).toEqual({ id: 'u1', email: 'a@b' });
    });

    it('throws when not found', async () => {
      userRepo.findOneBy!.mockResolvedValue(null);
      await expect(service.findByEmail('nobody')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findUserWithPassword', () => {
    it('delegates to repository', async () => {
      userRepo.getUserWithPassword!.mockResolvedValue({
        id: 'u1',
        password: 'h',
      } as unknown as User);

      const res = await service.findUserWithPassword('a@b');
      expect(userRepo.getUserWithPassword).toHaveBeenCalledWith('a@b');
      expect(res).toEqual({ id: 'u1', password: 'h' });
    });
  });

  describe('findOneWithRelations / getUserStoreRoles', () => {
    it('returns relations when found', async () => {
      const u = { id: 'u1', roles: [{ roleName: 'X' }] } as any;
      userRepo.findOneWithRelations!.mockResolvedValue(u);

      const res = await service.findOneWithRelations('u1');
      expect(userRepo.findOneWithRelations).toHaveBeenCalledWith('u1');
      expect(res).toEqual(u);

      const roles = await service.getUserStoreRoles('u1');
      expect(roles).toEqual(u.roles);
    });

    it('throws when not found', async () => {
      userRepo.findOneWithRelations!.mockResolvedValue(null);
      await expect(service.findOneWithRelations('no')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('assignRole / revokeRole', () => {
    it('assigns role when everything ok', async () => {
      const user = { id: 'u1', roles: [] } as any;
      const store = { id: 's1' } as any;

      // mock getEntityById (BaseService) via spy on service instance
      jest.spyOn(service as any, 'getEntityById').mockResolvedValue(user);
      storeService.getEntityById!.mockResolvedValue(store);
      userRoleService.findByStoreUser!.mockResolvedValue(null);

      const savedRole = {
        id: 'r1',
        roleName: StoreRoles.ADMIN,
        user,
        store,
      } as UserRole;
      userRoleService.create!.mockResolvedValue(savedRole);
      userRepo.addRoleToUser!.mockResolvedValue({
        ...user,
        roles: [savedRole],
      });

      const res = await service.assignRole('u1', StoreRoles.ADMIN, 's1');

      expect(service.getEntityById).toHaveBeenCalledWith('u1');
      expect(storeService.getEntityById).toHaveBeenCalledWith('s1');
      expect(userRoleService.findByStoreUser).toHaveBeenCalledWith('u1', 's1');
      expect(userRoleService.create).toHaveBeenCalled();
      expect(userRepo.addRoleToUser).toHaveBeenCalled();
      expect(res).toEqual(savedRole);
    });

    it('revokeRole calls repository to remove', async () => {
      userRepo.removeRoleFromUser!.mockResolvedValue(
        true as unknown as DeleteResult
      );
      await service.revokeRole('u1', 'r1', 's1');
      expect(userRepo.removeRoleFromUser).toHaveBeenCalledWith(
        'u1',
        'r1',
        's1'
      );
    });

    it('assignRole throws if user not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);
      await expect(
        service.assignRole('no', StoreRoles.GUEST, 's1')
      ).rejects.toThrow(NotFoundException);
    });

    it('assignRole throws if store not found', async () => {
      jest
        .spyOn(service, 'getEntityById')
        .mockResolvedValue({ id: 'u1' } as User);
      storeService.getEntityById!.mockResolvedValue(null);
      await expect(
        service.assignRole('u1', StoreRoles.GUEST, 'missing')
      ).rejects.toThrow(NotFoundException);
    });

    it('assignRole throws if already exists', async () => {
      jest
        .spyOn(service, 'getEntityById')
        .mockResolvedValue({ id: 'u1' } as User);
      storeService.getEntityById!.mockResolvedValue({ id: 's1' } as Store);
      userRoleService.findByStoreUser!.mockResolvedValue({
        id: 'already',
      } as UserRole);
      await expect(
        service.assignRole('u1', StoreRoles.GUEST, 's1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createStore', () => {
    it('creates store and assigns owner role', async () => {
      const owner = { id: 'owner1' } as User;
      jest.spyOn(service, 'getEntityById').mockResolvedValue(owner);

      const dto = { name: 'StoreX' } as CreateStoreDto;
      const created = { id: 'store1', name: 'StoreX' } as Store;
      storeService.create!.mockResolvedValue(created);

      // spy assignRole to avoid internal logic execution
      jest
        .spyOn(service, 'assignRole')
        .mockResolvedValue({ id: 'role1' } as UserRole);

      const res = await service.createStore(owner.id, dto);
      expect(service.getEntityById).toHaveBeenCalledWith(owner.id);
      expect(storeService.create).toHaveBeenCalledWith({ ...dto, owner });
      expect(service.assignRole).toHaveBeenCalledWith(
        owner.id,
        StoreRoles.ADMIN,
        created.id
      );
      expect(res).toEqual(created);
    });

    it('throws when owner not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);
      await expect(
        service.createStore('no', { name: 'x' } as Store)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isUserSiteAdmin', () => {
    it('returns true when user siteRole is ADMIN', async () => {
      userRepo.findOneWithRelations!.mockResolvedValue({
        id: 'u1',
        siteRole: AdminRoles.ADMIN,
      } as User);
      const res = await service.isUserSiteAdmin('u1');
      expect(res).toBe(true);
    });

    it('returns false when not admin', async () => {
      userRepo.findOneWithRelations!.mockResolvedValue({
        id: 'u1',
        siteRole: AdminRoles.USER,
      } as User);
      const res = await service.isUserSiteAdmin('u1');
      expect(res).toBe(false);
    });
  });
});
