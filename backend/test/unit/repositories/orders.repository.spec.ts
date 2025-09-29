import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { Order } from 'src/entities/store/product/order.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from '../utils/helpers';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';

describe('OrdersRepository', () => {
  let repository: OrdersRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let manager: Partial<MockedMethods<EntityManager>>;

  const mockOrder: Order = {
    id: 'o1',
    user: { id: 'u1' } as User,
    store: { id: 's1' } as Store,
    status: 'pending',
    totalAmount: 100,
    shipping: {} as any,
    billing: {} as any,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Order;

  beforeEach(async () => {
    manager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      manager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<OrdersRepository>(OrdersRepository);
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  it('findByUser calls find with correct where, relations, order', async () => {
    (repository.find as jest.Mock).mockResolvedValue([mockOrder]);
    const res = await repository.findByUser('u1');
    expect(repository.find).toHaveBeenCalledWith({
      where: { user: { id: 'u1' } },
      relations: ['store', 'items', 'items.variant', 'items.product'],
      order: { createdAt: 'DESC' },
    });
    expect(res).toEqual([mockOrder]);
  });

  it('findByStore calls find with correct where, relations, order', async () => {
    (repository.find as jest.Mock).mockResolvedValue([mockOrder]);
    const res = await repository.findByStore('s1');
    expect(repository.find).toHaveBeenCalledWith({
      where: { store: { id: 's1' } },
      relations: ['user', 'items', 'items.variant', 'items.product'],
      order: { createdAt: 'DESC' },
    });
    expect(res).toEqual([mockOrder]);
  });

  it('findWithItems calls findOne with full relations', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue(mockOrder);
    const res = await repository.findWithItems('o1');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'o1' },
      relations: ['user', 'store', 'items', 'items.variant', 'items.product'],
    });
    expect(res).toEqual(mockOrder);
  });
});
