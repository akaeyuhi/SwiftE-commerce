import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from 'src/modules/store/orders/orders.controller';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from '../utils/helpers';
import { Order } from 'src/entities/store/product/order.entity';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { UpdateOrderDto } from 'src/modules/store/orders/dto/update-order.dto';
import { Request } from 'express';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/auth/policy/guards/entity-owner.guard';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: Partial<MockedMethods<OrdersService>>;
  let policyMock: ReturnType<typeof createPolicyMock>;
  let guardMock: ReturnType<typeof createGuardMock>;

  const mockOrder: Order = {
    id: 'o1',
    user: { id: 'u1' } as User,
    store: { id: 's1' } as Store,
    status: 'pending',
    totalAmount: 0,
    shipping: {} as any,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Order;

  beforeEach(async () => {
    service = createServiceMock<OrdersService>([
      'findByStore',
      'createOrder',
      'getOrderWithItems',
      'findByUser',
      'updateStatus',
    ]);
    policyMock = createPolicyMock();
    guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: EntityOwnerGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it('findAllByStore delegates to findByStore', async () => {
    service.findByStore!.mockResolvedValue([mockOrder]);
    const res = await controller.findAllByStore('s1');
    expect(service.findByStore).toHaveBeenCalledWith('s1');
    expect(res).toEqual([mockOrder]);
  });

  it('createUserOrder sets userId and delegates', async () => {
    const dto: CreateOrderDto = {
      userId: 'u1',
      storeId: 's1',
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1 }] as any,
      shipping: {} as any,
    };
    service.createOrder!.mockResolvedValue(mockOrder);
    const fakeReq: any = { user: { id: 'u1', isSiteAdmin: false } };
    await controller.createUserOrder('s1', { ...dto }, fakeReq as Request);
    expect(service.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', storeId: 's1' })
    );
  });

  it('findOne delegates getOrderWithItems', async () => {
    service.getOrderWithItems!.mockResolvedValue(mockOrder);
    const res = await controller.findOne('o1');
    expect(service.getOrderWithItems).toHaveBeenCalledWith('o1');
    expect(res).toEqual(mockOrder);
  });

  it('findByUser filters by storeId', async () => {
    const orders = [
      { ...mockOrder, store: { id: 's1' } as any },
      { ...mockOrder, store: { id: 's2' } as any },
    ];
    service.findByUser!.mockResolvedValue(orders as any);
    const res = await controller.findByUser('s1', 'u1');
    expect(service.findByUser).toHaveBeenCalledWith('u1');
    expect(res).toEqual([orders[0]]);
  });

  it('updateStatus delegates to updateStatus', async () => {
    service.updateStatus!.mockResolvedValue(mockOrder);
    const res = await controller.updateStatus('s1', 'o1', {
      status: 'shipped',
    } as UpdateOrderDto);
    expect(service.updateStatus).toHaveBeenCalledWith('o1', 'shipped');
    expect(res).toEqual(mockOrder);
  });
});
