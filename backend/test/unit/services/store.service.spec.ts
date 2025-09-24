import { Test, TestingModule } from '@nestjs/testing';
import { StoreService } from 'src/modules/store/store.service';
import { StoreRepository } from 'src/modules/store/store.repository';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { jest } from '@jest/globals';
import { mockMapper, mockRepository } from 'test/unit/utils/test-helpers';

describe('StoreService', () => {
  let service: StoreService;
  let repo: jest.Mocked<Partial<StoreRepository>>;
  let mapper: jest.Mocked<Partial<StoreMapper>>;

  beforeEach(async () => {
    repo = mockRepository<StoreRepository>([
      'findStoreByName',
      'save',
      'findById',
    ]);

    mapper = mockMapper<StoreMapper>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: StoreRepository, useValue: repo },
        { provide: StoreMapper, useValue: mapper },
      ],
    }).compile();

    service = module.get(StoreService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('throws when store name already in use', async () => {
      (repo.findStoreByName as jest.Mock).mockResolvedValue({
        id: 's1',
      } as never);

      await expect(service.create({ name: 'X' } as any)).rejects.toThrow(
        BadRequestException
      );
      expect(repo.findStoreByName).toHaveBeenCalledWith('X');
    });

    it('creates store when name unused and returns dto', async () => {
      (repo.findStoreByName as jest.Mock).mockResolvedValue(null as never);
      const dto = { name: 'New' } as any;
      const entity = { name: 'New' } as any;
      (mapper.toEntity as jest.Mock).mockReturnValue(entity);
      const saved = { id: 's2', name: 'New' } as any;
      (repo.save as jest.Mock).mockResolvedValue(saved as never);
      (mapper.toDto as jest.Mock).mockReturnValue({
        id: 's2',
        name: 'New',
      } as any);

      const res = await service.create(dto);
      expect(repo.findStoreByName).toHaveBeenCalledWith('New');
      expect(mapper.toEntity).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(mapper.toDto).toHaveBeenCalledWith(saved);
      expect(res).toEqual({ id: 's2', name: 'New' });
    });
  });

  describe('hasUserStoreRole', () => {
    it('throws when store not found', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null as never);
      const fakeRole = { store: { id: 's1' } } as any;
      await expect(service.hasUserStoreRole(fakeRole)).rejects.toThrow(
        BadRequestException
      );
      expect(repo.findById).toHaveBeenCalledWith('s1');
    });

    it('returns true when matching role exists', async () => {
      const userRole: UserRole = {
        id: 'r1',
        roleName: 'STORE_ADMIN' as any,
        user: { id: 'u1' } as any,
        store: { id: 's1' } as any,
      } as any;
      const storeEntity: any = {
        id: 's1',
        userRoles: [{ user: { id: 'u1' }, roleName: 'STORE_ADMIN' } as any],
      };
      (repo.findById as jest.Mock).mockResolvedValue(storeEntity as never);
      const res = await service.hasUserStoreRole(userRole as any);
      expect(repo.findById).toHaveBeenCalledWith('s1');
      expect(res).toBe(true);
    });

    it('returns false when no matching role present', async () => {
      const userRole: UserRole = {
        id: 'r2',
        roleName: 'STORE_USER' as any,
        user: { id: 'u2' } as any,
        store: { id: 's2' } as any,
      } as any;
      const storeEntity: any = {
        id: 's2',
        userRoles: [
          { user: { id: 'someone' }, roleName: 'STORE_ADMIN' } as any,
        ],
      };
      (repo.findById as jest.Mock).mockResolvedValue(storeEntity as never);
      const res = await service.hasUserStoreRole(userRole as any);
      expect(res).toBe(false);
    });
  });
});
