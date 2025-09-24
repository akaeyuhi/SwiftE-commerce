import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from 'src/modules/store/cart/cart.controller';
import { CartService } from 'src/modules/store/cart/cart.service';
import { CreateCartDto } from 'src/modules/store/cart/dto/create-cart.dto';
import { UpdateCartDto } from 'src/modules/store/cart/dto/update-cart.dto';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { mockService } from 'test/unit/utils/test-helpers';

describe('CartController', () => {
  let controller: CartController;
  let service: jest.Mocked<Partial<CartService>>;

  beforeEach(async () => {
    service = mockService<CartService>([
      'create',
      'findAll',
      'findOne',
      'update',
      'remove',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: service }],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should delegate to service.create', async () => {
    const dto: CreateCartDto = { userId: 'u1', storeId: 's1' } as any;
    const out: Partial<ShoppingCart> = { id: 'c1' };
    (service.create as jest.Mock).mockResolvedValue(out as any);

    const res = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(out);
  });

  it('findAll should delegate to service.findAll', async () => {
    const items = [{ id: 'c1' }] as any;
    (service.findAll as jest.Mock).mockResolvedValue(items as any);
    const res = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(res).toEqual(items);
  });

  it('findOne should delegate to service.findOne', async () => {
    const out = { id: 'c1' } as any;
    (service.findOne as jest.Mock).mockResolvedValue(out as any);
    const res = await controller.findOne('c1');
    expect(service.findOne).toHaveBeenCalledWith('c1');
    expect(res).toEqual(out);
  });

  it('update should delegate to service.update', async () => {
    const dto: UpdateCartDto = {} as any;
    const out = { id: 'c1' } as any;
    (service.update as jest.Mock).mockResolvedValue(out as any);
    const res = await controller.update('c1', dto);
    expect(service.update).toHaveBeenCalledWith('c1', dto);
    expect(res).toEqual(out);
  });

  it('remove should delegate to service.remove', async () => {
    (service.remove as jest.Mock).mockResolvedValue(undefined);
    const res = await controller.remove('c1');
    expect(service.remove).toHaveBeenCalledWith('c1');
    expect(res).toBeUndefined();
  });
});
