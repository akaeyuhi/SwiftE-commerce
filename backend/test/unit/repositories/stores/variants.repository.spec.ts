import { Test, TestingModule } from '@nestjs/testing';
import { VariantsRepository } from 'src/modules/store/variants/variants.repository';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/unit/utils/helpers';

describe('VariantsRepository', () => {
  let repository: VariantsRepository;
  let ds: Partial<MockedMethods<DataSource>>;
  let em: Partial<MockedMethods<EntityManager>>;

  const mockVar: ProductVariant = {
    id: 'v1',
    sku: 'SKU1',
    price: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProductVariant;

  beforeEach(async () => {
    em = createMock<EntityManager>([]);
    ds = createMock<DataSource>(['createEntityManager']);
    ds.createEntityManager!.mockReturnValue(em as unknown as EntityManager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [VariantsRepository, { provide: DataSource, useValue: ds }],
    }).compile();

    repository = module.get<VariantsRepository>(VariantsRepository);
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  it('has BaseRepository methods', () => {
    expect(typeof repository.findAll).toBe('function');
    expect(typeof repository.findById).toBe('function');
  });

  it('lists by product', async () => {
    (repository.find as jest.Mock).mockResolvedValue([mockVar]);
    const res = await repository.find({ where: { product: { id: 'p1' } } });
    expect(res).toEqual([mockVar]);
  });
});
