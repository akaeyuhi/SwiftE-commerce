import { Test } from '@nestjs/testing';
import { ProductsController } from 'src/modules/products/products.controller';
import { ProductsService } from 'src/modules/products/products.service';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from '../utils/helpers';
import { Product } from 'src/entities/store/product/product.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { Store } from 'src/entities/store/store.entity';

describe('ProductsController', () => {
  let ctrl: ProductsController;
  let svc: Partial<MockedMethods<ProductsService>>;
  const policyMock = createPolicyMock();
  const guardMock = createGuardMock();

  const mockProd: Product = {
    id: 'p1',
    name: 'N',
    store: { id: 's1' } as Store,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  beforeEach(async () => {
    svc = createServiceMock<ProductsService>([
      'findAllByStore',
      'findProductWithRelations',
      'create',
      'addPhotos',
      'addMainPhoto',
      'removePhoto',
      'findProductsByCategory',
      'attachCategoryToProduct',
    ]);
    const mod = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: svc },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();
    ctrl = mod.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  it('createProduct delegates', async () => {
    const dto: CreateProductDto = { name: 'N', storeId: 's1' };
    const files = [];
    svc.create!.mockResolvedValue(mockProd);
    const res = await ctrl.createProduct('s1', dto, files);
    expect(svc.create).toHaveBeenCalledWith(
      { ...dto, storeId: 's1' },
      files,
      undefined
    );
    expect(res).toEqual(mockProd);
  });

  it('addPhotosToProduct delegates', async () => {
    const photos = [{}] as any[];
    svc.addPhotos!.mockResolvedValue([mockProd] as any);
    await ctrl.addPhotosToProduct('s1', 'p1', photos);
    expect(svc.addPhotos).toHaveBeenCalledWith('p1', 's1', photos);
  });

  it('deletePhoto delegates', async () => {
    svc.removePhoto!.mockResolvedValue(undefined);
    const res = await ctrl.deletePhoto('photo1');
    expect(svc.removePhoto).toHaveBeenCalledWith('photo1');
    expect(res).toEqual({ success: true });
  });
});
