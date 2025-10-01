import { Test } from '@nestjs/testing';
import { ProductPhotoRepository } from 'src/modules/products/product-photo/product-photo.repository';
import { createMock, MockedMethods } from '../utils/helpers';
import { DataSource, EntityManager } from 'typeorm';

describe('ProductPhotoRepository', () => {
  let repo: ProductPhotoRepository;
  let ds: Partial<MockedMethods<DataSource>>;
  let em: Partial<MockedMethods<EntityManager>>;

  beforeEach(async () => {
    em = createMock<EntityManager>([]);
    ds = createMock<DataSource>(['createEntityManager']);
    ds.createEntityManager!.mockReturnValue(em as unknown as EntityManager);

    const mod = await Test.createTestingModule({
      providers: [
        ProductPhotoRepository,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    repo = mod.get<ProductPhotoRepository>(ProductPhotoRepository);
    jest.spyOn(repo, 'find').mockImplementation(jest.fn());
    jest.spyOn(repo, 'findById').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  it('inherits BaseRepository methods', () => {
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.createEntity).toBe('function');
    expect(typeof repo.deleteById).toBe('function');
  });
});
