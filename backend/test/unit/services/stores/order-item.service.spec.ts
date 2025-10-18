// test/unit/services/order-item.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemService } from 'src/modules/store/orders/order-item/order-item.service';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';
import { createRepositoryMock, MockedMethods } from 'test/unit/helpers';
import { Order } from 'src/entities/store/product/order.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';

describe('OrderItemService', () => {
  let service: OrderItemService;
  let repo: Partial<MockedMethods<OrderItemRepository>>;

  const dto: CreateOrderItemDto = {
    productId: 'p1',
    variantId: 'v1',
    productName: 'Prod',
    sku: 'SKU1',
    unitPrice: 10,
    quantity: 2,
  };

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
    repo = createRepositoryMock<OrderItemRepository>([
      'createEntity',
      'findByOrder',
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemService,
        { provide: OrderItemRepository, useValue: repo },
      ],
    }).compile();
    service = module.get<OrderItemService>(OrderItemService);
    jest.clearAllMocks();
  });

  describe('createForOrder', () => {
    it('computes lineTotal and calls createEntity', async () => {
      (repo.createEntity as jest.Mock).mockResolvedValue(mockItem);
      const result = await service.createForOrder('o1', dto);
      expect(repo.createEntity).toHaveBeenCalledWith({
        order: { id: 'o1' },
        product: { id: 'p1' },
        variant: { id: 'v1' },
        productName: 'Prod',
        sku: 'SKU1',
        unitPrice: 10,
        quantity: 2,
        lineTotal: 20,
      });
      expect(result).toEqual(mockItem);
    });

    it('handles zero price or quantity gracefully', async () => {
      const dto2 = { ...dto, unitPrice: 0, quantity: 0 };
      (repo.createEntity as jest.Mock).mockResolvedValue({
        ...mockItem,
        lineTotal: 0,
      });
      const result = await service.createForOrder('o1', dto2);
      expect(repo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({ lineTotal: 0 })
      );
      expect(result.lineTotal).toBe(0);
    });
  });

  describe('createManyForOrder', () => {
    it('creates multiple items in sequence', async () => {
      (repo.createEntity as jest.Mock).mockResolvedValue(mockItem);
      const items = [dto, dto];
      const result = await service.createManyForOrder('o1', items);
      expect(repo.createEntity).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockItem, mockItem]);
    });
  });

  describe('getByOrder', () => {
    it('delegates to findByOrder', async () => {
      (repo.findByOrder as jest.Mock).mockResolvedValue([mockItem]);
      const res = await service.getByOrder('o1');
      expect(repo.findByOrder).toHaveBeenCalledWith('o1');
      expect(res).toEqual([mockItem]);
    });
  });
});
