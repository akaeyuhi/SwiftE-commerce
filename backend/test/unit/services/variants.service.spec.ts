import { Test } from '@nestjs/testing';
import { VariantsService } from 'src/modules/products/variants/variants.service';
import { VariantsRepository } from 'src/modules/products/variants/variants.repository';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { CreateVariantDto } from 'src/modules/products/variants/dto/create-variant.dto';
import {
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('VariantsService', () => {
  let svc: VariantsService;
  let repo: Partial<MockedMethods<VariantsRepository>>;
  let invSvc: Partial<MockedMethods<InventoryService>>;

  const dto: CreateVariantDto = {
    productId: 'p1',
    price: 50,
  };
  const mockVar: ProductVariant = {
    id: 'v1',
    sku: 'S1',
    price: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProductVariant;

  beforeEach(async () => {
    repo = createRepositoryMock<VariantsRepository>([
      'findOne',
      'create',
      'save',
      'findById',
      'find',
      'findOneBy',
    ]);
    invSvc = createServiceMock<InventoryService>([
      'create',
      'update',
      'findInventoryByVariantId',
    ]);

    const module = await Test.createTestingModule({
      providers: [
        VariantsService,
        { provide: VariantsRepository, useValue: repo },
        { provide: InventoryService, useValue: invSvc },
      ],
    }).compile();

    svc = module.get<VariantsService>(VariantsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('generates SKU when missing and saves', async () => {
      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVar);
      repo.save!.mockResolvedValue(mockVar);
      const res = await svc.create(dto);
      expect(repo.save).toHaveBeenCalledWith(mockVar);
      expect(res).toEqual(mockVar);
    });

    it('throws on SKU conflict', async () => {
      repo.findOne!.mockResolvedValue({ id: 'v2' } as any);
      await expect(svc.create({ ...dto, sku: 'SAME' })).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException if not exist', async () => {
      repo.findById!.mockResolvedValue(null);
      await expect(svc.update('v1', {} as any)).rejects.toThrow(
        NotFoundException
      );
    });

    it('updates fields and saves', async () => {
      const existing = { ...mockVar };
      repo.findById!.mockResolvedValue(existing as any);
      repo.save!.mockResolvedValue({ ...existing, price: 60 } as any);
      const res = await svc.update('v1', { price: 60 });
      expect(existing.price).toBe(60);
      expect(res.price).toBe(60);
    });
  });

  describe('attribute methods', () => {
    it('addAttributes merges JSON', async () => {
      const v = { ...mockVar, attributes: { a: 1 } } as any;
      repo.findOneBy!.mockResolvedValue(v);
      repo.save!.mockResolvedValue({ ...v, attributes: { a: 1, b: 2 } });
      const res = await svc.addAttributes('v1', { b: 2 });
      expect(res.attributes).toEqual({ a: 1, b: 2 });
    });

    it('removeAttribute removes key', async () => {
      const v = { ...mockVar, attributes: { a: 1, b: 2 } } as any;
      repo.findOneBy!.mockResolvedValue(v);
      repo.save!.mockResolvedValue({ ...v, attributes: { b: 2 } });
      const res = await svc.removeAttribute('v1', 'a');
      expect(res.attributes).toEqual({ b: 2 });
    });
  });

  describe('inventory methods', () => {
    it('setInventory creates when missing', async () => {
      invSvc.findInventoryByVariantId!.mockResolvedValue(null);
      invSvc.create!.mockResolvedValue({ quantity: 5 } as any);
      const res = await svc.setInventory('s1', 'v1', 5);
      expect(invSvc.create).toHaveBeenCalled();
      expect(res.quantity).toBe(5);
    });

    it('adjustInventory throws if missing', async () => {
      invSvc.findInventoryByVariantId!.mockResolvedValue(null);
      await expect(svc.adjustInventory('v1', 1)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
