import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  createRepositoryMock,
  MockedMethods,
  createMock,
} from '../utils/helpers';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: Partial<MockedMethods<OrdersRepository>>;
  let itemRepo: Partial<MockedMethods<OrderItemRepository>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let manager: Partial<MockedMethods<EntityManager>>;
  let txOrderRepo: any;
  let txItemRepo: any;

  const dto: CreateOrderDto = {
    userId: 'u1',
    storeId: 's1',
    items: [
      {
        productId: 'p1',
        variantId: 'v1',
        quantity: 2,
        unitPrice: 10,
        productName: 'N',
        sku: 'S',
      },
    ] as CreateOrderItemDto[],
    shipping: {} as any,
  };

  const savedOrder: Order = {
    id: 'o1',
    ...dto,
    status: 'pending',
    totalAmount: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  } as unknown as Order;

  beforeEach(async () => {
    orderRepo = createRepositoryMock<OrdersRepository>(['findById', 'find']);
    itemRepo = createRepositoryMock<OrderItemRepository>([]);
    manager = createMock<EntityManager>(['getRepository']);
    dataSource = createMock<DataSource>(['transaction']);
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (runInTx) => {
        txOrderRepo = createMock<Repository<Order>>([
          'create',
          'save',
          'findOne',
        ]);
        txItemRepo = createMock<Repository<any>>(['create', 'save']);
        manager
          .getRepository!.mockReturnValueOnce(txOrderRepo)
          .mockReturnValueOnce(txItemRepo);
        // call the callback with our fake manager
        return await (runInTx as (em: EntityManager) => Promise<any>)(
          manager as any
        );
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: orderRepo },
        { provide: OrderItemRepository, useValue: itemRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('throws BadRequestException when no items', async () => {
      await expect(
        service.createOrder({ userId: 'u1', storeId: 's1', items: [] } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('creates order and items in transaction', async () => {
      txOrderRepo.create.mockReturnValue(savedOrder);
      txOrderRepo.save.mockResolvedValue(savedOrder);
      txOrderRepo.findOne.mockResolvedValue(savedOrder);
      txItemRepo.create.mockReturnValue({} as any);
      txItemRepo.save.mockResolvedValue({} as any);

      const res = await service.createOrder(dto);
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(txOrderRepo.create).toHaveBeenCalled();
      expect(txOrderRepo.save).toHaveBeenCalled();
      expect(txItemRepo.save).toHaveBeenCalled();
      expect(res).toEqual(savedOrder);
    });
  });

  describe('findByUser', () => {
    it('delegates to orderRepo.findByUser', async () => {
      orderRepo.find!.mockResolvedValue([savedOrder]);
      const res = await service.findByUser('u1');
      expect(orderRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 'u1' } },
        relations: ['store', 'items', 'items.variant', 'items.product'],
        order: { createdAt: 'DESC' },
      });
      expect(res).toEqual([savedOrder]);
    });
  });

  describe('getOrderWithItems', () => {
    it('throws NotFoundException if missing', async () => {
      orderRepo.findOne!.mockResolvedValue(null);
      await expect(service.getOrderWithItems('o1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('returns order when found', async () => {
      orderRepo.findOne!.mockResolvedValue(savedOrder);
      const res = await service.getOrderWithItems('o1');
      expect(res).toEqual(savedOrder);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException if missing', async () => {
      orderRepo.findById!.mockResolvedValue(null);
      await expect(service.updateStatus('o1', 'shipped')).rejects.toThrow(
        NotFoundException
      );
    });

    it('saves updated status', async () => {
      const order = { ...savedOrder };
      orderRepo.findById!.mockResolvedValue(order as any);
      orderRepo.save!.mockResolvedValue({ ...order, status: 'shipped' } as any);

      const res = await service.updateStatus('o1', 'shipped');
      expect(order.status).toBe('shipped');
      expect(orderRepo.save).toHaveBeenCalledWith(order);
      expect(res.status).toBe('shipped');
    });
  });
});
