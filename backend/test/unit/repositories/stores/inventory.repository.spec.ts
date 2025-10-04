import { Test, TestingModule } from '@nestjs/testing';
import { InventoryRepository } from 'src/modules/store/inventory/inventory.repository';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<InventoryRepository>(InventoryRepository);

    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'save').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  describe('BaseRepository inheritance', () => {
    it('has CRUD methods', () => {
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });
  });
});
