import { Test } from '@nestjs/testing';
import { ProductsController } from 'src/modules/products/products.controller';
import { ProductsService } from 'src/modules/products/products.service';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
  createDeepMock,
  createMockInterceptor,
  createMockAnalyticsQueue,
} from 'test/unit/utils/helpers';
import { Product } from 'src/entities/store/product/product.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { Store } from 'src/entities/store/store.entity';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { ProductPhotosInterceptor } from 'src/modules/infrastructure/interceptors/product-photo/product-photo.interceptor';

describe('ProductsController', () => {
  let ctrl: ProductsController;
  let svc: Partial<MockedMethods<ProductsService>>;
  let queue: Partial<MockedMethods<BaseQueueService>>;
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
    queue = createMockAnalyticsQueue();
    const interceptorMock = createMockInterceptor();

    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: AnalyticsQueueService, useValue: queue },
        { provide: ProductsService, useValue: svc },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: RecordEventInterceptor, useValue: interceptorMock },
        { provide: ProductPhotosInterceptor, useValue: interceptorMock },
      ],
    }).compile();
    ctrl = module.get<ProductsController>(ProductsController);
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
