import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { VariantsRepository } from 'src/modules/store/variants/variants.repository';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';
import { UpdateVariantDto } from 'src/modules/store/variants/dto/update-variant.dto';
import {
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from '../../utils/helpers';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';

describe('VariantsService', () => {
  let service: VariantsService;
  let repo: Partial<MockedMethods<VariantsRepository>>;
  let inventoryService: Partial<MockedMethods<InventoryService>>;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Store;

  const mockVariant: ProductVariant = {
    id: 'v1',
    product: mockProduct,
    sku: 'TEST-SKU-001',
    price: 50.0,
    attributes: { color: 'red', size: 'M' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as ProductVariant;

  const mockInventory: Inventory = {
    id: 'inv1',
    variant: mockVariant,
    store: mockStore,
    quantity: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Inventory;

  beforeEach(async () => {
    repo = createRepositoryMock<VariantsRepository>([
      'findOne',
      'findOneBy',
      'findById',
      'find',
      'create',
      'save',
      'update',
      'delete',
    ]);

    inventoryService = createServiceMock<InventoryService>([
      'create',
      'update',
      'findInventoryByVariantId',
      'adjustInventory',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        { provide: VariantsRepository, useValue: repo },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(VariantsService);
      expect(typeof service.create).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.findOne).toBe('function');
    });
  });

  describe('create', () => {
    const createDto: CreateVariantDto = {
      productId: 'p1',
      price: 50.0,
    };

    it('should generate SKU when not provided', async () => {
      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          product: { id: 'p1' },
          price: 50.0,
          sku: expect.any(String),
        })
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockVariant);
    });

    it('should use provided SKU if available', async () => {
      const dtoWithSku = { ...createDto, sku: 'CUSTOM-SKU' };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(dtoWithSku);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'CUSTOM-SKU',
        })
      );
    });

    it('should throw ConflictException when provided SKU already exists', async () => {
      const dtoWithSku = { ...createDto, sku: 'DUPLICATE-SKU' };

      repo.findOne!.mockResolvedValue(mockVariant);

      await expect(service.create(dtoWithSku)).rejects.toThrow(
        ConflictException
      );
      await expect(service.create(dtoWithSku)).rejects.toThrow(
        `SKU 'DUPLICATE-SKU' is already in use`
      );
    });

    it('should retry SKU generation on collision', async () => {
      repo
        .findOne!.mockResolvedValueOnce(mockVariant) // First generated SKU exists
        .mockResolvedValueOnce(null); // Second generated SKU is available

      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledTimes(2);
    });

    it('should use fallback SKU with random number after max retries', async () => {
      let callCount = 0;

      repo.findOne!.mockImplementation(async () => {
        callCount++;
        // First 6 attempts fail, fallback succeeds
        return callCount <= 6 ? mockVariant : null;
      });

      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(createDto);

      // Verify fallback SKU format includes random number
      const createCall = (repo.create as jest.Mock).mock.calls[0][0];
      expect(createCall.sku).toMatch(/^P-P1-[A-F0-9]+-\d+\.\d+$/);

      // Should have tried generation 6 times plus final fallback check
      expect(repo.findOne).toHaveBeenCalledTimes(7);
    });

    it('should create with attributes if provided', async () => {
      const dtoWithAttrs = {
        ...createDto,
        attributes: { color: 'blue', size: 'L' },
      };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(dtoWithAttrs);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: { color: 'blue', size: 'L' },
        })
      );
    });

    it('should create inventory when initialQuantity provided', async () => {
      const dtoWithInventory = {
        ...createDto,
        storeId: 's1',
        initialQuantity: 100,
      };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);
      inventoryService.create!.mockResolvedValue(mockInventory);

      await service.create(dtoWithInventory);

      expect(inventoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          variantId: mockVariant.id,
          storeId: 's1',
          quantity: 100,
        })
      );
    });

    it('should not create inventory when initialQuantity not provided', async () => {
      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(createDto);

      expect(inventoryService.create).not.toHaveBeenCalled();
    });

    it('should trim SKU before validation', async () => {
      const dtoWithWhitespace = { ...createDto, sku: '  TRIMMED-SKU  ' };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(dtoWithWhitespace);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'TRIMMED-SKU',
        })
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateVariantDto = {
      price: 60.0,
    };

    it('should throw NotFoundException when variant not found', async () => {
      repo.findById!.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Variant not found'
      );
    });

    it('should update price', async () => {
      const variant = { ...mockVariant };
      repo.findById!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, price: 60.0 });

      const result = await service.update('v1', updateDto);

      expect(variant.price).toBe(60.0);
      expect(repo.save).toHaveBeenCalledWith(variant);
      expect(result.price).toBe(60.0);
    });

    it('should update SKU when different and available', async () => {
      const variant = { ...mockVariant };
      const updateWithSku = { sku: 'NEW-SKU' };

      repo.findById!.mockResolvedValue(variant);
      repo.findOne!.mockResolvedValue(null); // New SKU is available
      repo.save!.mockResolvedValue({ ...variant, sku: 'NEW-SKU' });

      const result = await service.update('v1', updateWithSku);

      expect(variant.sku).toBe('NEW-SKU');
      expect(result.sku).toBe('NEW-SKU');
    });

    it('should throw ConflictException when new SKU already exists', async () => {
      const variant = { ...mockVariant };
      const updateWithSku = { sku: 'TAKEN-SKU' };

      repo.findById!.mockResolvedValue(variant);
      repo.findOne!.mockResolvedValue({
        ...mockVariant,
        id: 'v2',
      }); // Different variant has this SKU

      await expect(service.update('v1', updateWithSku)).rejects.toThrow(
        ConflictException
      );
    });

    it('should allow keeping same SKU', async () => {
      const variant = { ...mockVariant };
      const updateWithSameSku = { sku: 'TEST-SKU-001', price: 75.0 };

      repo.findById!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, price: 75.0 });

      await service.update('v1', updateWithSameSku);

      // Should not check uniqueness when SKU unchanged
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('should merge attributes when provided', async () => {
      const variant = {
        ...mockVariant,
        attributes: { color: 'red', size: 'M' },
      };
      const updateWithAttrs = {
        attributes: { color: 'blue', material: 'cotton' },
      };

      repo.findById!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({
        ...variant,
        attributes: { color: 'blue', size: 'M', material: 'cotton' },
      });

      const result = await service.update('v1', updateWithAttrs);

      expect(result.attributes).toEqual({
        color: 'blue',
        size: 'M',
        material: 'cotton',
      });
    });

    it('should replace attributes when replaceAttributes flag is true', async () => {
      const variant = {
        ...mockVariant,
        attributes: { color: 'red', size: 'M', old: 'value' },
      };
      const updateWithReplace = {
        attributes: { color: 'blue' },
        replaceAttributes: true,
      } as any;

      repo.findById!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({
        ...variant,
        attributes: { color: 'blue' },
      });

      const result = await service.update('v1', updateWithReplace);

      expect(result.attributes).toEqual({ color: 'blue' });
    });

    it('should handle undefined price gracefully', async () => {
      const variant = { ...mockVariant };
      const updateWithoutPrice = { sku: 'NEW-SKU' };

      repo.findById!.mockResolvedValue(variant);
      repo.findOne!.mockResolvedValue(null);
      repo.save!.mockResolvedValue(variant);

      await service.update('v1', updateWithoutPrice);

      expect(variant.price).toBe(50.0); // Should remain unchanged
    });
  });

  describe('findBySku', () => {
    it('should find variant by SKU', async () => {
      repo.findOne!.mockResolvedValue(mockVariant);

      const result = await service.findBySku('TEST-SKU-001');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(result).toEqual(mockVariant);
    });

    it('should return null when SKU not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.findBySku('NONEXISTENT-SKU');

      expect(result).toBeNull();
    });
  });

  describe('listByProduct', () => {
    it('should list all variants for a product', async () => {
      const variants = [
        mockVariant,
        { ...mockVariant, id: 'v2', sku: 'TEST-SKU-002' },
      ];

      repo.find!.mockResolvedValue(variants);

      const result = await service.listByProduct('p1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { product: { id: 'p1' } },
      });
      expect(result).toEqual(variants);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no variants found', async () => {
      repo.find!.mockResolvedValue([]);

      const result = await service.listByProduct('p1');

      expect(result).toEqual([]);
    });
  });

  describe('addAttributes', () => {
    it('should merge new attributes with existing ones', async () => {
      const variant = {
        ...mockVariant,
        attributes: { color: 'red', size: 'M' },
      };
      const patch = { material: 'cotton', color: 'blue' };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({
        ...variant,
        attributes: { color: 'blue', size: 'M', material: 'cotton' },
      });

      const result = await service.addAttributes('v1', patch);

      expect(result.attributes).toEqual({
        color: 'blue',
        size: 'M',
        material: 'cotton',
      });
      expect(repo.save).toHaveBeenCalled();
    });

    it('should handle null existing attributes', async () => {
      const variant = {
        ...mockVariant,
        attributes: null,
      } as unknown as ProductVariant;
      const patch = { color: 'red' };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, attributes: patch });

      const result = await service.addAttributes('v1', patch);

      expect(result.attributes).toEqual(patch);
    });

    it('should throw NotFoundException when variant not found', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(service.addAttributes('nonexistent', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('replaceAttributes', () => {
    it('should replace entire attributes object', async () => {
      const variant = {
        ...mockVariant,
        attributes: { color: 'red', size: 'M', old: 'value' },
      };
      const newAttributes = { color: 'blue', material: 'cotton' };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, attributes: newAttributes });

      const result = await service.replaceAttributes('v1', newAttributes);

      expect(result.attributes).toEqual(newAttributes);
      expect(result.attributes).not.toHaveProperty('old');
    });

    it('should clear attributes when null provided', async () => {
      const variant = { ...mockVariant, attributes: { color: 'red' } };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, attributes: undefined });

      const result = await service.replaceAttributes('v1', null);

      expect(result.attributes).toBeUndefined();
    });

    it('should throw NotFoundException when variant not found', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(
        service.replaceAttributes('nonexistent', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAttribute', () => {
    it('should remove specific attribute key', async () => {
      const variant = {
        ...mockVariant,
        attributes: { color: 'red', size: 'M', material: 'cotton' },
      };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({
        ...variant,
        attributes: { size: 'M', material: 'cotton' },
      });

      const result = await service.removeAttribute('v1', 'color');

      expect(result.attributes).toEqual({ size: 'M', material: 'cotton' });
      expect(result.attributes).not.toHaveProperty('color');
    });

    it('should return unchanged variant when key does not exist', async () => {
      const variant = { ...mockVariant, attributes: { color: 'red' } };

      repo.findOneBy!.mockResolvedValue(variant);

      const result = await service.removeAttribute('v1', 'nonexistent');

      expect(result).toEqual(variant);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should handle variant with null attributes', async () => {
      const variant = {
        ...mockVariant,
        attributes: null,
      } as unknown as ProductVariant;

      repo.findOneBy!.mockResolvedValue(variant);

      const result = await service.removeAttribute('v1', 'color');

      expect(result).toEqual(variant);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when variant not found', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(
        service.removeAttribute('nonexistent', 'color')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePrice', () => {
    it('should update variant price', async () => {
      const variant = { ...mockVariant };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, price: 75.0 });

      const result = await service.updatePrice('v1', 75.0);

      expect(variant.price).toBe(75.0);
      expect(result.price).toBe(75.0);
      expect(repo.save).toHaveBeenCalledWith(variant);
    });

    it('should throw NotFoundException when variant not found', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(service.updatePrice('nonexistent', 100.0)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle zero price', async () => {
      const variant = { ...mockVariant };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, price: 0 });

      const result = await service.updatePrice('v1', 0);

      expect(result.price).toBe(0);
    });

    it('should handle negative price', async () => {
      const variant = { ...mockVariant };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({ ...variant, price: -10 });

      const result = await service.updatePrice('v1', -10);

      expect(result.price).toBe(-10);
    });
  });

  describe('setInventory', () => {
    it('should create inventory when none exists', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(null);
      inventoryService.create!.mockResolvedValue(mockInventory);

      const result = await service.setInventory('s1', 'v1', 100);

      expect(inventoryService.findInventoryByVariantId).toHaveBeenCalledWith(
        'v1'
      );
      expect(inventoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          variantId: 'v1',
          storeId: 's1',
          quantity: 100,
        })
      );
      expect(result).toEqual(mockInventory);
    });

    it('should adjust existing inventory', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      inventoryService.adjustInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 150,
      });

      await service.setInventory('s1', 'v1', 150);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 150);
      expect(inventoryService.create).not.toHaveBeenCalled();
    });
  });

  describe('adjustInventory', () => {
    it('should adjust inventory by delta', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(inventory);
      inventoryService.adjustInventory!.mockResolvedValue({
        ...inventory,
        quantity: 110,
      });

      const result = await service.adjustInventory('v1', 10);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        inventory.id,
        110
      );
      expect(result.quantity).toBe(110);
    });

    it('should handle negative delta (reduce inventory)', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(inventory);
      inventoryService.adjustInventory!.mockResolvedValue({
        ...inventory,
        quantity: 90,
      });

      const result = await service.adjustInventory('v1', -10);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        inventory.id,
        90
      );
      expect(result.quantity).toBe(90);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(null);

      await expect(service.adjustInventory('v1', 10)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.adjustInventory('v1', 10)).rejects.toThrow(
        'Inventory not found'
      );
    });
  });

  describe('findWithRelations', () => {
    it('should find variant with product, store, and categories', async () => {
      const variantWithRelations = {
        ...mockVariant,
        product: {
          ...mockProduct,
          store: mockStore,
          categories: [{ id: 'cat1', name: 'Category 1' }],
        },
      } as ProductVariant;

      repo.findOne!.mockResolvedValue(variantWithRelations);

      const result = await service.findWithRelations('v1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'v1' },
        relations: {
          product: {
            store: true,
            categories: true,
          },
        },
      });
      expect(result).toEqual(variantWithRelations);
      expect(result?.product.store).toBeDefined();
      expect(result?.product.categories).toBeDefined();
    });

    it('should return null when variant not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.findWithRelations('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent create operations', async () => {
      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      const dto: CreateVariantDto = { productId: 'p1', price: 50 };

      const promises = [
        service.create(dto),
        service.create(dto),
        service.create(dto),
      ];

      await Promise.all(promises);

      expect(repo.save).toHaveBeenCalledTimes(3);
    });

    it('should handle empty attributes object', async () => {
      const variant = { ...mockVariant, attributes: {} };

      repo.findOneBy!.mockResolvedValue(variant);
      repo.save!.mockResolvedValue({
        ...variant,
        attributes: { color: 'red' },
      });

      const result = await service.addAttributes('v1', { color: 'red' });

      expect(result.attributes).toEqual({ color: 'red' });
    });

    it('should handle very long SKU strings', async () => {
      const longSku = 'A'.repeat(255);
      const dto: CreateVariantDto = {
        productId: 'p1',
        price: 50,
        sku: longSku,
      };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sku: longSku })
      );
    });

    it('should handle special characters in SKU', async () => {
      const specialSku = 'SKU-WITH-SPECIAL-CHARS!@#$%';
      const dto: CreateVariantDto = {
        productId: 'p1',
        price: 50,
        sku: specialSku,
      };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(mockVariant);
      repo.save!.mockResolvedValue(mockVariant);

      await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sku: specialSku })
      );
    });
  });
});
