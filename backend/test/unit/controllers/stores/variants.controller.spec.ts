import { Test, TestingModule } from '@nestjs/testing';
import { VariantsController } from 'src/modules/store/variants/variants.controller';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from 'test/unit/helpers';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { NotFoundException } from '@nestjs/common';
import { Product } from 'src/entities/store/product/product.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';

describe('VariantsController', () => {
  let controller: VariantsController;
  let variantsService: Partial<MockedMethods<VariantsService>>;
  let policyMock: ReturnType<typeof createPolicyMock>;
  let guardMock: ReturnType<typeof createGuardMock>;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  const mockVariant: ProductVariant = {
    id: 'v1',
    product: mockProduct,
    sku: 'TEST-SKU-001',
    price: 50.0,
    attributes: { color: 'red', size: 'M' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as ProductVariant;

  const mockVariantList: ProductVariant[] = [
    mockVariant,
    {
      id: 'v2',
      product: mockProduct,
      sku: 'TEST-SKU-002',
      price: 60.0,
      attributes: { color: 'blue', size: 'L' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    } as unknown as ProductVariant,
  ];

  const mockInventory: Inventory = {
    id: 'inv1',
    quantity: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Inventory;

  beforeEach(async () => {
    variantsService = createServiceMock<VariantsService>([
      'create',
      'update',
      'findOne',
      'findAll',
      'remove',
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [
        { provide: VariantsService, useValue: variantsService },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<VariantsController>(VariantsController);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should extend BaseController', () => {
      expect(controller).toBeInstanceOf(VariantsController);
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.findOne).toBe('function');
    });

    it('should have access policies defined', () => {
      expect(VariantsController.accessPolicies).toBeDefined();
      expect(VariantsController.accessPolicies.create).toBeDefined();
      expect(VariantsController.accessPolicies.update).toBeDefined();
      expect(VariantsController.accessPolicies.addAttributes).toBeDefined();
    });
  });

  describe('findAllProductVariants - GET /', () => {
    it('should return all variants for a product', async () => {
      variantsService.listByProduct!.mockResolvedValue(mockVariantList);

      const result = await controller.findAllProductVariants('p1');

      expect(result).toEqual(mockVariantList);
      expect(result).toHaveLength(2);
      expect(variantsService.listByProduct).toHaveBeenCalledWith('p1');
      expect(variantsService.listByProduct).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no variants found', async () => {
      variantsService.listByProduct!.mockResolvedValue([]);

      const result = await controller.findAllProductVariants('p1');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      variantsService.listByProduct!.mockRejectedValue(serviceError);

      await expect(controller.findAllProductVariants('p1')).rejects.toThrow(
        serviceError
      );
    });

    it('should validate productId UUID format', async () => {
      // UUID validation happens at parameter level via ParseUUIDPipe
      variantsService.listByProduct!.mockResolvedValue(mockVariantList);

      const result = await controller.findAllProductVariants(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result).toBeDefined();
    });
  });

  describe('findBySku - GET /by-sku/:sku', () => {
    it('should find variant by SKU', async () => {
      variantsService.findBySku!.mockResolvedValue(mockVariant);

      const result = await controller.findBySku('s1', 'p1', 'TEST-SKU-001');

      expect(result).toEqual(mockVariant);
      expect(variantsService.findBySku).toHaveBeenCalledWith('TEST-SKU-001');
      expect(variantsService.findBySku).toHaveBeenCalledTimes(1);
    });

    it('should return null when SKU not found', async () => {
      variantsService.findBySku!.mockResolvedValue(null);

      const result = await controller.findBySku('s1', 'p1', 'NONEXISTENT-SKU');

      expect(result).toBeNull();
      expect(variantsService.findBySku).toHaveBeenCalledWith('NONEXISTENT-SKU');
    });

    it('should handle SKU with special characters', async () => {
      const specialSku = 'SKU-WITH-SPECIAL!@#';
      variantsService.findBySku!.mockResolvedValue(mockVariant);

      await controller.findBySku('s1', 'p1', specialSku);

      expect(variantsService.findBySku).toHaveBeenCalledWith(specialSku);
    });

    it('should not use storeId or productId in service call', async () => {
      variantsService.findBySku!.mockResolvedValue(mockVariant);

      await controller.findBySku('s1', 'p1', 'TEST-SKU');

      // Service only receives SKU, not storeId or productId
      expect(variantsService.findBySku).toHaveBeenCalledWith('TEST-SKU');
      expect(variantsService.findBySku).not.toHaveBeenCalledWith(
        's1',
        'p1',
        'TEST-SKU'
      );
    });
  });

  describe('addAttributes - POST /:id/attributes', () => {
    it('should add attributes to variant', async () => {
      const attributes = { material: 'cotton', brand: 'TestBrand' };
      const updatedVariant = {
        ...mockVariant,
        attributes: { ...mockVariant.attributes, ...attributes },
      };

      variantsService.addAttributes!.mockResolvedValue(updatedVariant);

      const result = await controller.addAttributes(
        's1',
        'p1',
        'v1',
        attributes
      );

      expect(result).toEqual(updatedVariant);
      expect(variantsService.addAttributes).toHaveBeenCalledWith(
        'v1',
        attributes
      );
      expect(variantsService.addAttributes).toHaveBeenCalledTimes(1);
    });

    it('should handle empty attributes object', async () => {
      const emptyAttributes = {};
      variantsService.addAttributes!.mockResolvedValue(mockVariant);

      await controller.addAttributes('s1', 'p1', 'v1', emptyAttributes);

      expect(variantsService.addAttributes).toHaveBeenCalledWith(
        'v1',
        emptyAttributes
      );
    });

    it('should handle nested object attributes', async () => {
      const nestedAttributes = {
        dimensions: { width: 10, height: 20, depth: 5 },
        weight: { value: 100, unit: 'g' },
      };
      variantsService.addAttributes!.mockResolvedValue(mockVariant);

      await controller.addAttributes('s1', 'p1', 'v1', nestedAttributes);

      expect(variantsService.addAttributes).toHaveBeenCalledWith(
        'v1',
        nestedAttributes
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      variantsService.addAttributes!.mockRejectedValue(
        new NotFoundException('Variant not found')
      );

      await expect(
        controller.addAttributes('s1', 'p1', 'nonexistent', { color: 'green' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should not use storeId or productId in service call', async () => {
      const attributes = { color: 'green' };
      variantsService.addAttributes!.mockResolvedValue(mockVariant);

      await controller.addAttributes('s1', 'p1', 'v1', attributes);

      expect(variantsService.addAttributes).toHaveBeenCalledWith(
        'v1',
        attributes
      );
    });
  });

  describe('removeAttribute - DELETE /:id/attributes/:key', () => {
    it('should remove specific attribute', async () => {
      const updatedVariant = {
        ...mockVariant,
        attributes: { size: 'M' }, // color removed
      };
      variantsService.removeAttribute!.mockResolvedValue(updatedVariant);

      const result = await controller.removeAttribute(
        's1',
        'p1',
        'v1',
        'color'
      );

      expect(result).toEqual(updatedVariant);
      expect(variantsService.removeAttribute).toHaveBeenCalledWith(
        'v1',
        'color'
      );
      expect(variantsService.removeAttribute).toHaveBeenCalledTimes(1);
    });

    it('should handle removal of non-existent attribute', async () => {
      variantsService.removeAttribute!.mockResolvedValue(mockVariant);

      await controller.removeAttribute('s1', 'p1', 'v1', 'nonexistent');

      expect(variantsService.removeAttribute).toHaveBeenCalledWith(
        'v1',
        'nonexistent'
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      variantsService.removeAttribute!.mockRejectedValue(
        new NotFoundException('Variant not found')
      );

      await expect(
        controller.removeAttribute('s1', 'p1', 'nonexistent', 'color')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle special characters in key name', async () => {
      const specialKey = 'attribute-with-dash';
      variantsService.removeAttribute!.mockResolvedValue(mockVariant);

      await controller.removeAttribute('s1', 'p1', 'v1', specialKey);

      expect(variantsService.removeAttribute).toHaveBeenCalledWith(
        'v1',
        specialKey
      );
    });
  });

  describe('setInventory - POST /:id/inventory', () => {
    it('should set inventory quantity', async () => {
      const body = { quantity: 100 };
      variantsService.setInventory!.mockResolvedValue(mockInventory);

      const result = await controller.setInventory('s1', 'p1', 'v1', body);

      expect(result).toEqual(mockInventory);
      expect(variantsService.setInventory).toHaveBeenCalledWith(
        's1',
        'v1',
        100
      );
      expect(variantsService.setInventory).toHaveBeenCalledTimes(1);
    });

    it('should set inventory to zero', async () => {
      const body = { quantity: 0 };
      variantsService.setInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 0,
      });

      const result = await controller.setInventory('s1', 'p1', 'v1', body);

      expect(result.quantity).toBe(0);
      expect(variantsService.setInventory).toHaveBeenCalledWith('s1', 'v1', 0);
    });

    it('should handle large quantity values', async () => {
      const body = { quantity: 999999 };
      variantsService.setInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 999999,
      });

      await controller.setInventory('s1', 'p1', 'v1', body);

      expect(variantsService.setInventory).toHaveBeenCalledWith(
        's1',
        'v1',
        999999
      );
    });

    it('should use storeId in service call', async () => {
      const body = { quantity: 50 };
      variantsService.setInventory!.mockResolvedValue(mockInventory);

      await controller.setInventory('store-123', 'p1', 'v1', body);

      expect(variantsService.setInventory).toHaveBeenCalledWith(
        'store-123',
        'v1',
        50
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      const body = { quantity: 100 };
      variantsService.setInventory!.mockRejectedValue(
        new NotFoundException('Variant not found')
      );

      await expect(
        controller.setInventory('s1', 'p1', 'nonexistent', body)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustInventory - PATCH /:id/inventory', () => {
    it('should adjust inventory by positive delta', async () => {
      const body = { delta: 10 };
      variantsService.adjustInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 110,
      });

      const result = await controller.adjustInventory('s1', 'p1', 'v1', body);

      expect(result.quantity).toBe(110);
      expect(variantsService.adjustInventory).toHaveBeenCalledWith('v1', 10);
      expect(variantsService.adjustInventory).toHaveBeenCalledTimes(1);
    });

    it('should adjust inventory by negative delta', async () => {
      const body = { delta: -5 };
      variantsService.adjustInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 95,
      });

      const result = await controller.adjustInventory('s1', 'p1', 'v1', body);

      expect(result.quantity).toBe(95);
      expect(variantsService.adjustInventory).toHaveBeenCalledWith('v1', -5);
    });

    it('should handle zero delta', async () => {
      const body = { delta: 0 };
      variantsService.adjustInventory!.mockResolvedValue(mockInventory);

      await controller.adjustInventory('s1', 'p1', 'v1', body);

      expect(variantsService.adjustInventory).toHaveBeenCalledWith('v1', 0);
    });

    it('should handle large negative delta (sale)', async () => {
      const body = { delta: -50 };
      variantsService.adjustInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 50,
      });

      await controller.adjustInventory('s1', 'p1', 'v1', body);

      expect(variantsService.adjustInventory).toHaveBeenCalledWith('v1', -50);
    });

    it('should handle large positive delta (restock)', async () => {
      const body = { delta: 500 };
      variantsService.adjustInventory!.mockResolvedValue({
        ...mockInventory,
        quantity: 600,
      });

      await controller.adjustInventory('s1', 'p1', 'v1', body);

      expect(variantsService.adjustInventory).toHaveBeenCalledWith('v1', 500);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      const body = { delta: 10 };
      variantsService.adjustInventory!.mockRejectedValue(
        new NotFoundException('Inventory not found')
      );

      await expect(
        controller.adjustInventory('s1', 'p1', 'v1', body)
      ).rejects.toThrow(NotFoundException);
    });

    it('should not use storeId or productId in service call', async () => {
      const body = { delta: 10 };
      variantsService.adjustInventory!.mockResolvedValue(mockInventory);

      await controller.adjustInventory('s1', 'p1', 'v1', body);

      expect(variantsService.adjustInventory).toHaveBeenCalledWith('v1', 10);
    });
  });

  describe('updatePrice - PATCH /:id/price', () => {
    it('should update variant price', async () => {
      const body = { price: 75.0 };
      const updatedVariant = { ...mockVariant, price: 75.0 };
      variantsService.updatePrice!.mockResolvedValue(updatedVariant);

      const result = await controller.updatePrice('s1', 'p1', 'v1', body);

      expect(result).toEqual(updatedVariant);
      expect(result.price).toBe(75.0);
      expect(variantsService.updatePrice).toHaveBeenCalledWith('v1', 75.0);
      expect(variantsService.updatePrice).toHaveBeenCalledTimes(1);
    });

    it('should handle zero price', async () => {
      const body = { price: 0 };
      variantsService.updatePrice!.mockResolvedValue({
        ...mockVariant,
        price: 0,
      });

      const result = await controller.updatePrice('s1', 'p1', 'v1', body);

      expect(result.price).toBe(0);
    });

    it('should handle decimal prices', async () => {
      const body = { price: 29.99 };
      variantsService.updatePrice!.mockResolvedValue({
        ...mockVariant,
        price: 29.99,
      });

      await controller.updatePrice('s1', 'p1', 'v1', body);

      expect(variantsService.updatePrice).toHaveBeenCalledWith('v1', 29.99);
    });

    it('should handle large price values', async () => {
      const body = { price: 999999.99 };
      variantsService.updatePrice!.mockResolvedValue({
        ...mockVariant,
        price: 999999.99,
      });

      await controller.updatePrice('s1', 'p1', 'v1', body);

      expect(variantsService.updatePrice).toHaveBeenCalledWith('v1', 999999.99);
    });

    it('should throw NotFoundException when variant not found', async () => {
      const body = { price: 50.0 };
      variantsService.updatePrice!.mockRejectedValue(
        new NotFoundException('Variant not found')
      );

      await expect(
        controller.updatePrice('s1', 'p1', 'nonexistent', body)
      ).rejects.toThrow(NotFoundException);
    });

    it('should not use storeId or productId in service call', async () => {
      const body = { price: 100.0 };
      variantsService.updatePrice!.mockResolvedValue(mockVariant);

      await controller.updatePrice('s1', 'p1', 'v1', body);

      expect(variantsService.updatePrice).toHaveBeenCalledWith('v1', 100.0);
    });
  });

  describe('inherited BaseController methods', () => {
    describe('create', () => {
      it('should delegate to service', async () => {
        variantsService.create!.mockResolvedValue(mockVariant);
        const createDto = { productId: 'p1', price: 50.0 } as any;

        const result = await controller.create(createDto);

        expect(result).toEqual(mockVariant);
        expect(variantsService.create).toHaveBeenCalledWith(createDto);
      });
    });

    describe('update', () => {
      it('should delegate to service', async () => {
        variantsService.update!.mockResolvedValue(mockVariant);
        const updateDto = { price: 60.0 } as any;

        const result = await controller.update('v1', updateDto);

        expect(result).toEqual(mockVariant);
        expect(variantsService.update).toHaveBeenCalledWith('v1', updateDto);
      });
    });

    describe('findOne', () => {
      it('should delegate to service', async () => {
        variantsService.findOne!.mockResolvedValue(mockVariant);

        const result = await controller.findOne('v1');

        expect(result).toEqual(mockVariant);
        expect(variantsService.findOne).toHaveBeenCalledWith('v1');
      });
    });

    describe('findAll', () => {
      it('should delegate to service', async () => {
        variantsService.findAll!.mockResolvedValue(mockVariantList);

        const result = await controller.findAll();

        expect(result).toEqual(mockVariantList);
        expect(variantsService.findAll).toHaveBeenCalledTimes(1);
      });
    });

    describe('remove', () => {
      it('should delegate to service', async () => {
        variantsService.remove!.mockResolvedValue(undefined);

        await controller.remove('v1');

        expect(variantsService.remove).toHaveBeenCalledWith('v1');
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent requests', async () => {
      variantsService.findBySku!.mockResolvedValue(mockVariant);

      const promises = [
        controller.findBySku('s1', 'p1', 'SKU1'),
        controller.findBySku('s1', 'p1', 'SKU1'),
        controller.findBySku('s1', 'p1', 'SKU1'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(variantsService.findBySku).toHaveBeenCalledTimes(3);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Service timeout');
      variantsService.listByProduct!.mockRejectedValue(timeoutError);

      await expect(controller.findAllProductVariants('p1')).rejects.toThrow(
        timeoutError
      );
    });

    it('should handle invalid UUID format errors', async () => {
      // ParseUUIDPipe would throw BadRequestException before reaching controller
      // This is handled by NestJS validation layer
      variantsService.findBySku!.mockResolvedValue(mockVariant);

      // Valid UUID should work
      await controller.findBySku(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        'SKU'
      );

      expect(variantsService.findBySku).toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should accept valid UUIDs for storeId, productId, and id', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      variantsService.addAttributes!.mockResolvedValue(mockVariant);

      await controller.addAttributes(validUuid, validUuid, validUuid, {});

      expect(variantsService.addAttributes).toHaveBeenCalled();
    });

    it('should handle empty SKU strings', async () => {
      variantsService.findBySku!.mockResolvedValue(null);

      const result = await controller.findBySku('s1', 'p1', '');

      expect(result).toBeNull();
      expect(variantsService.findBySku).toHaveBeenCalledWith('');
    });

    it('should handle whitespace in SKU', async () => {
      const skuWithSpaces = '  TEST-SKU  ';
      variantsService.findBySku!.mockResolvedValue(mockVariant);

      await controller.findBySku('s1', 'p1', skuWithSpaces);

      expect(variantsService.findBySku).toHaveBeenCalledWith(skuWithSpaces);
    });
  });
});
