import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from 'src/modules/store/cart/cart.controller';
import { CartService } from 'src/modules/store/cart/cart.service';
import { CreateCartDto } from 'src/modules/store/cart/dto/create-cart.dto';
import { UpdateCartDto } from 'src/modules/store/cart/dto/update-cart.dto';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import {
  createGuardMock,
  createServiceMock,
  createPolicyMock,
  MockedMethods,
} from '../utils/helpers';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';

describe('CartController', () => {
  let controller: CartController;
  let service: Partial<MockedMethods<CartService>>;

  beforeEach(async () => {
    const mockGuard = createGuardMock();
    const policyMock = createPolicyMock();
    service = createServiceMock<CartService>([
      'create',
      'findAll',
      'findOne',
      'update',
      'remove',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        { provide: CartService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        {
          provide: JwtAuthGuard,
          useValue: mockGuard,
        },
        {
          provide: StoreRolesGuard,
          useValue: mockGuard,
        },
        {
          provide: AdminGuard,
          useValue: mockGuard,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should delegate to service.create', async () => {
    const dto: CreateCartDto = { userId: 'u1', storeId: 's1' } as CreateCartDto;
    const out: Partial<ShoppingCart> = { id: 'c1' };
    service.create!.mockResolvedValue(out as ShoppingCart);

    const res = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(out);
  });

  it('findAll should delegate to service.findAll', async () => {
    const items = [{ id: 'c1' }] as any;
    service.findAll!.mockResolvedValue(items);
    const res = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(res).toEqual(items);
  });

  it('findOne should delegate to service.findOne', async () => {
    const out = { id: 'c1' } as any;
    service.findOne!.mockResolvedValue(out as any);
    const res = await controller.findOne('c1');
    expect(service.findOne).toHaveBeenCalledWith('c1');
    expect(res).toEqual(out);
  });

  it('update should delegate to service.update', async () => {
    const dto: UpdateCartDto = {} as any;
    const out = { id: 'c1' } as any;
    service.update!.mockResolvedValue(out as any);
    const res = await controller.update('c1', dto);
    expect(service.update).toHaveBeenCalledWith('c1', dto);
    expect(res).toEqual(out);
  });

  it('remove should delegate to service.remove', async () => {
    service.remove!.mockResolvedValue(undefined);
    const res = await controller.remove('c1');
    expect(service.remove).toHaveBeenCalledWith('c1');
    expect(res).toBeUndefined();
  });
});
