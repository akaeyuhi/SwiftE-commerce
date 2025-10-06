import { Test, TestingModule } from '@nestjs/testing';
import { StoreService } from 'src/modules/store/store.service';
import { StoreRepository } from 'src/modules/store/store.repository';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { BadRequestException } from '@nestjs/common';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { jest } from '@jest/globals';
import {
  createMapperMock,
  createRepositoryMock,
  MockedMethods,
} from 'test/utils/helpers';
import { Store } from 'src/entities/store/store.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

describe('StoreService', () => {
  let service: StoreService;
  let repo: Partial<MockedMethods<StoreRepository>>;
  let mapper: Partial<MockedMethods<StoreMapper>>;

  beforeEach(async () => {
    repo = createRepositoryMock<StoreRepository>([
      'findStoreByName',
      'save',
      'findById',
    ]);

    mapper = createMapperMock<StoreMapper>();

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
    it('throws when stores name already in use', async () => {
      repo.findStoreByName!.mockResolvedValue({
        id: 's1',
      } as Store);

      await expect(service.create({ name: 'X' } as any)).rejects.toThrow(
        BadRequestException
      );
      expect(repo.findStoreByName).toHaveBeenCalledWith('X');
    });

    it('creates stores when name unused and returns dto', async () => {
      repo.findStoreByName!.mockResolvedValue(null);
      const dto = { name: 'New' } as CreateStoreDto;
      const entity = { name: 'New' } as Store;
      mapper.toEntity!.mockReturnValue(entity);
      const saved = { id: 's2', name: 'New' } as Store;
      repo.save!.mockResolvedValue(saved);
      mapper.toDto!.mockReturnValue(saved);

      const res = await service.create(dto);
      expect(repo.findStoreByName).toHaveBeenCalledWith('New');
      expect(mapper.toEntity).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(mapper.toDto).toHaveBeenCalledWith(saved);
      expect(res).toEqual(saved);
    });
  });

  describe('hasUserStoreRole', () => {
    it('throws when stores not found', async () => {
      repo.findById!.mockResolvedValue(null);
      const fakeRole = { store: { id: 's1' } } as StoreRole;
      await expect(service.hasUserStoreRole(fakeRole)).rejects.toThrow(
        BadRequestException
      );
      expect(repo.findById).toHaveBeenCalledWith('s1');
    });

    it('returns true when matching role exists', async () => {
      const userRole = {
        id: 'r1',
        roleName: StoreRoles.ADMIN,
        user: { id: 'u1' },
        store: { id: 's1' },
      } as StoreRole;
      const storeEntity = {
        id: 's1',
        storeRoles: [
          { user: { id: 'u1' }, roleName: StoreRoles.ADMIN },
        ] as StoreRole[],
      } as Store;
      repo.findById!.mockResolvedValue(storeEntity);
      const res = await service.hasUserStoreRole(userRole);
      expect(repo.findById).toHaveBeenCalledWith('s1');
      expect(res).toBe(true);
    });

    it('returns false when no matching role present', async () => {
      const userRole = {
        id: 'r2',
        roleName: StoreRoles.GUEST,
        user: { id: 'u2' },
        store: { id: 's2' },
      } as StoreRole;
      const storeEntity = {
        id: 's2',
        storeRoles: [{ user: { id: 'someone' }, roleName: StoreRoles.ADMIN }],
      } as Store;
      repo.findById!.mockResolvedValue(storeEntity);
      const res = await service.hasUserStoreRole(userRole);
      expect(res).toBe(false);
    });
  });
});
