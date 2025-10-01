import { Test } from '@nestjs/testing';
import { VariantsController } from 'src/modules/store/variants/variants.controller';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from '../utils/helpers';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';

describe('VariantsController', () => {
  let ctrl: VariantsController;
  let svc: Partial<MockedMethods<VariantsService>>;
  let policyMock: ReturnType<typeof createPolicyMock>;
  let guardMock: ReturnType<typeof createGuardMock>;

  const mockVar: ProductVariant = {
    id: 'v1',
    sku: 'S1',
    price: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    svc = createServiceMock<VariantsService>([
      'listByProduct',
      'findBySku',
      'addAttributes',
      'removeAttribute',
      'setInventory',
      'adjustInventory',
      'updatePrice',
    ]);
    policyMock = createPolicyMock();
    guardMock = createGuardMock();

    const module = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [
        { provide: VariantsService, useValue: svc },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    ctrl = module.get<VariantsController>(VariantsController);
    jest.clearAllMocks();
  });

  it('findAllProductVariants delegates', async () => {
    svc.listByProduct!.mockResolvedValue([mockVar]);
    const res = await ctrl.findAllProductVariants('p1');
    expect(svc.listByProduct).toHaveBeenCalledWith('p1');
    expect(res).toEqual([mockVar]);
  });

  it('findBySku delegates', async () => {
    svc.findBySku!.mockResolvedValue(mockVar);
    const res = await ctrl.findBySku('s1', 'p1', 'SKU1');
    expect(svc.findBySku).toHaveBeenCalledWith('SKU1');
    expect(res).toEqual(mockVar);
  });

  it('addAttributes delegates', async () => {
    svc.addAttributes!.mockResolvedValue(mockVar);
    await ctrl.addAttributes('s1', 'p1', 'v1', { x: 1 });
    expect(svc.addAttributes).toHaveBeenCalledWith('v1', { x: 1 });
  });

  it('removeAttribute delegates', async () => {
    svc.removeAttribute!.mockResolvedValue(mockVar);
    await ctrl.removeAttribute('s1', 'p1', 'v1', 'x');
    expect(svc.removeAttribute).toHaveBeenCalledWith('v1', 'x');
  });

  it('setInventory delegates', async () => {
    svc.setInventory!.mockResolvedValue({ quantity: 5 } as any);
    await ctrl.setInventory('s1', 'p1', 'v1', { quantity: 5 });
    expect(svc.setInventory).toHaveBeenCalledWith('s1', 'v1', 5);
  });

  it('adjustInventory delegates', async () => {
    svc.adjustInventory!.mockResolvedValue({ quantity: 6 } as any);
    await ctrl.adjustInventory('s1', 'p1', 'v1', { delta: 1 });
    expect(svc.adjustInventory).toHaveBeenCalledWith('v1', 1);
  });

  it('updatePrice delegates', async () => {
    svc.updatePrice!.mockResolvedValue({ price: 20 } as any);
    await ctrl.updatePrice('s1', 'p1', 'v1', { price: 20 });
    expect(svc.updatePrice).toHaveBeenCalledWith('v1', 20);
  });
});
