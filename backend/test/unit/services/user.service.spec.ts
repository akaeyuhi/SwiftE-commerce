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
import { mockRepository, mockService, mockMapper } from '../utils/test-helpers';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Partial<UserRepository>>;
  let userRoleService: jest.Mocked<Partial<UserRoleService>>;
  let storeService: jest.Mocked<Partial<StoreService>>;
  let mapper: jest.Mocked<Partial<UserMapper>>;

  beforeEach(async () => {
    userRepo = mockRepository<UserRepository>([
      'findByEmail',
      'save',
      'findOneBy',
      'getUserWithPassword',
      'findOneWithRelations',
      'addRoleToUser',
      'removeRoleFromUser',
    ]);

    userRoleService = mockService<UserRoleService>([
      'findByStoreUser',
      'create',
    ]);

    storeService = mockService<StoreService>(['getEntityById', 'create']);

    mapper = mockMapper<UserMapper>(['toEntity', 'toDto']);

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
        username: 'u',
      } as any;

      (userRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      const entity = { email: dto.email, username: dto.username } as any;
      (mapper.toEntity as jest.Mock).mockReturnValue(entity);
      const saved = { id: 'u1', ...entity, passwordHash: 'h' } as any;
      (userRepo.save as jest.Mock).mockResolvedValue(saved);
      (mapper.toDto as jest.Mock).mockReturnValue({
        id: 'u1',
        email: dto.email,
      });

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
      const dto = { email: 'x@x.com', password: 'p' } as any;
      (userRepo.findByEmail as jest.Mock).mockResolvedValue({
        id: 'exists',
      } as any);
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(userRepo.findByEmail).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('update', () => {
    it('updates user and hashes new password', async () => {
      const dto = { password: 'newpass', username: 'newname' } as any;
      const existing = {
        id: 'u1',
        username: 'old',
        passwordHash: 'old',
      } as any;

      (userRepo.findOneBy as jest.Mock).mockResolvedValue(existing);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);

      // emulate save returning the updated entity
      (userRepo.save as jest.Mock).mockImplementation(async (u) => ({ ...u }));

      (mapper.toDto as jest.Mock).mockImplementation((u) => ({
        id: u.id,
        username: u.username,
      }));

      const res = await service.update('u1', dto);

      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(userRepo.save).toHaveBeenCalled();
      expect(res).toEqual({ id: existing.id, username: 'newname' });
    });

    it('throws when user not found', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(service.update('no', {} as any)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByEmail', () => {
    it('returns dto when found', async () => {
      const user = { id: 'u1', email: 'a@b' } as any;
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(user);
      (mapper.toDto as jest.Mock).mockReturnValue({ id: 'u1', email: 'a@b' });

      const res = await service.findByEmail('a@b');

      expect(userRepo.findOneBy).toHaveBeenCalledWith({ email: 'a@b' });
      expect(res).toEqual({ id: 'u1', email: 'a@b' });
    });

    it('throws when not found', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(service.findByEmail('nobody')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findUserWithPassword', () => {
    it('delegates to repository', async () => {
      (userRepo.getUserWithPassword as jest.Mock).mockResolvedValue({
        id: 'u1',
        password: 'h',
      } as any);

      const res = await service.findUserWithPassword('a@b');
      expect(userRepo.getUserWithPassword).toHaveBeenCalledWith('a@b');
      expect(res).toEqual({ id: 'u1', password: 'h' });
    });
  });

  describe('findOneWithRelations / getUserStoreRoles', () => {
    it('returns relations when found', async () => {
      const u = { id: 'u1', roles: [{ roleName: 'X' }] } as any;
      (userRepo.findOneWithRelations as jest.Mock).mockResolvedValue(u);

      const res = await service.findOneWithRelations('u1');
      expect(userRepo.findOneWithRelations).toHaveBeenCalledWith('u1');
      expect(res).toEqual(u);

      const roles = await service.getUserStoreRoles('u1');
      expect(roles).toEqual(u.roles);
    });

    it('throws when not found', async () => {
      (userRepo.findOneWithRelations as jest.Mock).mockResolvedValue(null);
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
      (storeService.getEntityById as jest.Mock).mockResolvedValue(store);
      (userRoleService.findByStoreUser as jest.Mock).mockResolvedValue(null);

      const savedRole = {
        id: 'r1',
        roleName: StoreRoles.ADMIN,
        user,
        store,
      } as any;

      (userRoleService.create as jest.Mock).mockResolvedValue(savedRole);
      (userRepo.addRoleToUser as jest.Mock).mockResolvedValue({
        ...user,
        roles: [savedRole],
      });

      const res = await service.assignRole('u1', StoreRoles.ADMIN, 's1');

      expect((service as any).getEntityById).toHaveBeenCalledWith('u1');
      expect(storeService.getEntityById).toHaveBeenCalledWith('s1');
      expect(userRoleService.findByStoreUser).toHaveBeenCalledWith('u1', 's1');
      expect(userRoleService.create).toHaveBeenCalled();
      expect(userRepo.addRoleToUser).toHaveBeenCalled();
      expect(res).toEqual(savedRole);
    });

    it('revokeRole calls repository to remove', async () => {
      (userRepo.removeRoleFromUser as jest.Mock).mockResolvedValue(undefined);
      await service.revokeRole('u1', 'r1', 's1');
      expect(userRepo.removeRoleFromUser).toHaveBeenCalledWith(
        'u1',
        'r1',
        's1'
      );
    });

    it('assignRole throws if user not found', async () => {
      jest.spyOn(service as any, 'getEntityById').mockResolvedValue(null);
      await expect(
        service.assignRole('no', StoreRoles.GUEST, 's1')
      ).rejects.toThrow(NotFoundException);
    });

    it('assignRole throws if store not found', async () => {
      jest
        .spyOn(service as any, 'getEntityById')
        .mockResolvedValue({ id: 'u1' });
      (storeService.getEntityById as jest.Mock).mockResolvedValue(null);
      await expect(
        service.assignRole('u1', StoreRoles.GUEST, 'missing')
      ).rejects.toThrow(NotFoundException);
    });

    it('assignRole throws if already exists', async () => {
      jest
        .spyOn(service as any, 'getEntityById')
        .mockResolvedValue({ id: 'u1' });
      (storeService.getEntityById as jest.Mock).mockResolvedValue({ id: 's1' });
      (userRoleService.findByStoreUser as jest.Mock).mockResolvedValue({
        id: 'already',
      } as any);
      await expect(
        service.assignRole('u1', StoreRoles.GUEST, 's1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createStore', () => {
    it('creates store and assigns owner role', async () => {
      const owner = { id: 'owner1' } as any;
      jest.spyOn(service as any, 'getEntityById').mockResolvedValue(owner);

      const dto = { name: 'StoreX' } as any;
      const created = { id: 'store1', name: 'StoreX' } as any;
      (storeService.create as jest.Mock).mockResolvedValue(created);

      // spy assignRole to avoid internal logic execution
      jest
        .spyOn(service as any, 'assignRole')
        .mockResolvedValue({ id: 'role1' } as any);

      const res = await service.createStore(owner.id, dto);
      expect((service as any).getEntityById).toHaveBeenCalledWith(owner.id);
      expect(storeService.create).toHaveBeenCalledWith({ ...dto, owner });
      expect((service as any).assignRole).toHaveBeenCalledWith(
        owner.id,
        StoreRoles.ADMIN,
        created.id
      );
      expect(res).toEqual(created);
    });

    it('throws when owner not found', async () => {
      jest.spyOn(service as any, 'getEntityById').mockResolvedValue(null);
      await expect(
        service.createStore('no', { name: 'x' } as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isUserSiteAdmin', () => {
    it('returns true when user siteRole is ADMIN', async () => {
      (userRepo.findOneWithRelations as jest.Mock).mockResolvedValue({
        id: 'u1',
        siteRole: AdminRoles.ADMIN,
      } as any);
      const res = await service.isUserSiteAdmin('u1');
      expect(res).toBe(true);
    });

    it('returns false when not admin', async () => {
      (userRepo.findOneWithRelations as jest.Mock).mockResolvedValue({
        id: 'u1',
        siteRole: undefined,
      } as any);
      const res = await service.isUserSiteAdmin('u1');
      expect(res).toBe(false);
    });
  });
});
