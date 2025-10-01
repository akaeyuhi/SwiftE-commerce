import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from '../utils/helpers';
import { Order } from 'src/entities/store/product/order.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';

describe('OrderItemRepository', () => {
  let repository: OrderItemRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockItem: OrderItem = {
    id: 'i1',
    order: { id: 'o1' } as Order,
    product: { id: 'p1' } as Product,
    variant: { id: 'v1' } as ProductVariant,
    productName: 'Product Name',
    sku: 'sku1',
    quantity: 2,
    unitPrice: 10,
    lineTotal: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrderItem;

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<OrderItemRepository>(OrderItemRepository);

    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  describe('findByOrder', () => {
    it('delegates to find with correct where, relations, and order', async () => {
      (repository.find as jest.Mock).mockResolvedValue([mockItem]);

      const result = await repository.findByOrder('o1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { order: { id: 'o1' } },
        relations: ['product', 'variant'],
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual([mockItem]);
    });

    it('returns empty array when none', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);
      const result = await repository.findByOrder('o2');
      expect(result).toEqual([]);
    });

    it('handles errors', async () => {
      const err = new Error('DB error');
      (repository.find as jest.Mock).mockRejectedValue(err);
      await expect(repository.findByOrder('o1')).rejects.toThrow(err);
    });
  });

  describe('findByVariant', () => {
    it('delegates to find with correct where and relations', async () => {
      (repository.find as jest.Mock).mockResolvedValue([mockItem]);
      const result = await repository.findByVariant('v1');
      expect(repository.find).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
        relations: ['order'],
      });
      expect(result).toEqual([mockItem]);
    });

    it('returns empty array when none', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);
      const result = await repository.findByVariant('v2');
      expect(result).toEqual([]);
    });
  });
});
