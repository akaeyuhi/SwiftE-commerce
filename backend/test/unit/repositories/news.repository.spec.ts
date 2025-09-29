// test/unit/repositories/news.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NewsRepository } from 'src/modules/store/news/news.repository';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from '../utils/helpers';

describe('NewsRepository', () => {
  let repository: NewsRepository;
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
        NewsRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<NewsRepository>(NewsRepository);

    // Spy inherited methods
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'save').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  it('has BaseRepository methods', () => {
    expect(typeof repository.findAll).toBe('function');
    expect(typeof repository.findById).toBe('function');
  });
});
