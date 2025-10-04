import { Test } from '@nestjs/testing';
import { ProductsService } from 'src/modules/products/products.service';
import { ProductRepository } from 'src/modules/products/products.repository';
import { StoreService } from 'src/modules/store/store.service';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { ProductPhotoService } from 'src/modules/products/product-photo/product-photo.service';
import { Product } from 'src/entities/store/product/product.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { NotFoundException } from '@nestjs/common';
import {
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from 'test/utils/helpers';
import { Store } from 'src/entities/store/store.entity';

describe('ProductsService', () => {
  let svc: ProductsService;
  let prodRepo: Partial<MockedMethods<ProductRepository>>;
  let storeSvc: Partial<MockedMethods<StoreService>>;
  let catSvc: Partial<MockedMethods<CategoriesService>>;
  let photoSvc: Partial<MockedMethods<ProductPhotoService>>;

  const dto: CreateProductDto = {
    storeId: 's1',
    name: 'N',
    categoryIds: ['c1'],
  };
  const mockProd: Product = {
    id: 'p1',
    store: { id: 's1' } as Store,
    categories: [],
    name: 'N',
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [],
    photos: [],
    reviews: [],
  } as Product;

  beforeEach(async () => {
    prodRepo = createRepositoryMock<ProductRepository>([
      'createEntity',
      'findOne',
      'findOneBy',
      'save',
      'findAllByStore',
      'findWithRelations',
      'findProductsByCategory',
    ]);
    storeSvc = createServiceMock<StoreService>(['getEntityById']);
    catSvc = createServiceMock<CategoriesService>(['findOne']);
    photoSvc = createServiceMock<ProductPhotoService>([
      'addPhotos',
      'deletePhotoAndFile',
    ]);
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: prodRepo },
        { provide: StoreService, useValue: storeSvc },
        { provide: CategoriesService, useValue: catSvc },
        { provide: ProductPhotoService, useValue: photoSvc },
      ],
    }).compile();
    svc = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('findAllByStore delegates', async () => {
    prodRepo.findAllByStore!.mockResolvedValue([mockProd]);
    const res = await svc.findAllByStore('s1');
    expect(prodRepo.findAllByStore).toHaveBeenCalledWith('s1');
    expect(res).toEqual([mockProd]);
  });

  it('findProductWithRelations delegates', async () => {
    prodRepo.findWithRelations!.mockResolvedValue(mockProd);
    await svc.findProductWithRelations('p1');
    expect(prodRepo.findWithRelations).toHaveBeenCalledWith('p1');
  });

  it('create throws if stores not found', async () => {
    storeSvc.getEntityById!.mockResolvedValue(null);
    await expect(svc.create(dto)).rejects.toThrow(NotFoundException);
  });

  it('create persists product and attaches photos', async () => {
    storeSvc.getEntityById!.mockResolvedValue({ id: 's1' } as any);
    prodRepo.createEntity!.mockResolvedValue(mockProd);
    catSvc.findOne!.mockResolvedValue({ id: 'c1' } as any);
    prodRepo.save!.mockResolvedValue(mockProd);
    prodRepo.findOneBy!.mockResolvedValue(mockProd);
    photoSvc.addPhotos!.mockResolvedValue([{ id: 'y' }] as any);

    const files = [
      { buffer: Buffer.from(''), originalname: 'a.png', mimetype: 'image/png' },
    ] as any[];
    const res = await svc.create(
      { ...dto, categoryIds: undefined },
      files,
      files[0]
    );
    expect(prodRepo.createEntity).toHaveBeenCalled();
    expect(res).toEqual(mockProd);
  });

  it('addPhotos throws if product missing', async () => {
    (prodRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(svc.addPhotos('p1', 's1', [])).resolves.toBeNull();
    await expect(
      svc.addPhotos('p1', 's1', [{ buffer: Buffer.from('') } as any])
    ).rejects.toThrow(NotFoundException);
  });
});
