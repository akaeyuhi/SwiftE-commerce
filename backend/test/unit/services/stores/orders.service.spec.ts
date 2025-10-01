import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createMock,
  createRepositoryMock,
  MockedMethods,
} from 'test/unit/utils/helpers';
import { OrderStatus } from 'src/common/enums/order-status.enum';

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
    orderRepo = createRepositoryMock<OrdersRepository>([
      'findById',
      'find',
      'save',
      'findOne',
      'findByUser',
      'findWithItems',
    ]);
    txOrderRepo = createMock<Repository<Order>>(['create', 'save', 'findOne']);
    txItemRepo = createMock<Repository<any>>(['create', 'save']);
    itemRepo = createRepositoryMock<OrderItemRepository>([]);
    (itemRepo as any).metadata = { target: {} };
    manager = createMock<EntityManager>(['getRepository']);
    dataSource = createMock<DataSource>(['transaction']);
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (runInTx) => {
        manager
          .getRepository!.mockReturnValueOnce(txOrderRepo)
          .mockReturnValueOnce(txItemRepo);
        return await (runInTx as (em: EntityManager) => Promise<any>)(
          manager as any
        );
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DataSource, useValue: dataSource },
        { provide: OrdersRepository, useValue: orderRepo },
        { provide: OrderItemRepository, useValue: itemRepo },
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
      orderRepo.findByUser!.mockResolvedValue([savedOrder]);
      const res = await service.findByUser('u1');
      expect(orderRepo.findByUser).toHaveBeenCalledWith('u1');
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
      orderRepo.findWithItems!.mockResolvedValue(savedOrder);
      const res = await service.getOrderWithItems('o1');
      expect(res).toEqual(savedOrder);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException if missing', async () => {
      orderRepo.findById!.mockResolvedValue(null);
      await expect(
        service.updateStatus('o1', OrderStatus.SHIPPED)
      ).rejects.toThrow(NotFoundException);
    });

    it('saves updated status', async () => {
      const order = { ...savedOrder };
      orderRepo.findById!.mockResolvedValue(order as any);
      orderRepo.save!.mockResolvedValue({
        ...order,
        status: OrderStatus.SHIPPED,
      } as any);

      const res = await service.updateStatus('o1', OrderStatus.SHIPPED);
      expect(order.status).toBe(OrderStatus.SHIPPED);
      expect(orderRepo.save).toHaveBeenCalledWith(order);
      expect(res.status).toBe(OrderStatus.SHIPPED);
    });
  });
});
