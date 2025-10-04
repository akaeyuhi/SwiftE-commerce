import { Test, TestingModule } from '@nestjs/testing';
import { CartItemController } from 'src/modules/store/cart/cart-item/cart-item.controller';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from 'test/utils/helpers';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';

describe('CartItemController', () => {
  let controller: CartItemController;
  let cartItemService: Partial<MockedMethods<CartItemService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  // Mock data
  const mockCartItem: CartItem = {
    id: 'item1',
    cart: { id: 'cart1' } as any,
    variant: { id: 'variant1', name: 'Test Variant' } as any,
    quantity: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as CartItem;

  const mockCartItemList: CartItem[] = [
    mockCartItem,
    {
      id: 'item2',
      cart: { id: 'cart1' } as any,
      variant: { id: 'variant2', name: 'Test Variant 2' } as any,
      quantity: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as CartItem,
  ];

  const mockCartItemDto: CartItemDto = {
    cartId: 'cart1',
    variantId: 'variant1',
    quantity: 2,
  };

  const validStoreId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';
  const validItemId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    cartItemService = createServiceMock<CartItemService>([
      'findAll',
      'findOne',
      'create',
      'update',
      'remove',
      'addOrIncrement',
      'updateQuantity',
    ]);
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartItemController],
      providers: [
        { provide: CartItemService, useValue: cartItemService },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<CartItemController>(CartItemController);
    jest.clearAllMocks();
  });

  describe('module setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have CartItemService injected', () => {
      expect(controller['cartItemService']).toBeDefined();
    });

    it('should have static accessPolicies defined', () => {
      expect(CartItemController.accessPolicies).toBeDefined();
      expect(CartItemController.accessPolicies.findAll).toEqual({
        requireAuthenticated: true,
      });
      expect(CartItemController.accessPolicies.addOrIncrement).toEqual({
        requireAuthenticated: true,
      });
      expect(CartItemController.accessPolicies.updateQuantity).toEqual({
        requireAuthenticated: true,
      });
    });
  });

  describe('addOrIncrement - POST /add', () => {
    it('should add new item to cart', async () => {
      const newCartItem = { ...mockCartItem, id: 'newItem' } as CartItem;
      cartItemService.addOrIncrement!.mockResolvedValue(newCartItem);

      const result = await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      expect(result).toEqual(newCartItem);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto
      );
      expect(cartItemService.addOrIncrement).toHaveBeenCalledTimes(1);
    });

    it('should increment existing item quantity', async () => {
      const incrementedItem = { ...mockCartItem, quantity: 4 } as CartItem;
      cartItemService.addOrIncrement!.mockResolvedValue(incrementedItem);

      const result = await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      expect(result).toEqual(incrementedItem);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto
      );
    });

    it('should pass DTO without quantity when not provided', async () => {
      const dtoWithoutQuantity = {
        cartId: 'cart1',
        variantId: 'variant1',
      } as CartItemDto;
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(
        validStoreId,
        validUserId,
        dtoWithoutQuantity
      );

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        dtoWithoutQuantity
      );
    });

    it('should handle service validation errors', async () => {
      const validationError = new BadRequestException('Quantity must be > 0');
      cartItemService.addOrIncrement!.mockRejectedValue(validationError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(BadRequestException);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto
      );
    });

    it('should handle missing cart or variant errors', async () => {
      const notFoundError = new NotFoundException('Cart not found');
      cartItemService.addOrIncrement!.mockRejectedValue(notFoundError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle large quantity values', async () => {
      const largeQuantityDto = { ...mockCartItemDto, quantity: 999 };
      const largeQuantityItem = { ...mockCartItem, quantity: 999 } as CartItem;
      cartItemService.addOrIncrement!.mockResolvedValue(largeQuantityItem);

      const result = await controller.addOrIncrement(
        validStoreId,
        validUserId,
        largeQuantityDto
      );

      expect(result.quantity).toBe(999);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        largeQuantityDto
      );
    });

    it('should pass complete DTO to service', async () => {
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: mockCartItemDto.cartId,
          variantId: mockCartItemDto.variantId,
          quantity: mockCartItemDto.quantity,
        })
      );
    });
  });

  describe('updateQuantity - PUT /:itemId', () => {
    it('should update item quantity', async () => {
      const updatedItem = { ...mockCartItem, quantity: 5 } as CartItem;
      const updateDto = { quantity: 5 } as CartItemDto;
      cartItemService.updateQuantity!.mockResolvedValue(updatedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        updateDto
      );

      expect(result).toEqual(updatedItem);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        5
      );
      expect(cartItemService.updateQuantity).toHaveBeenCalledTimes(1);
    });

    it('should remove item when quantity is 0', async () => {
      const removedItem = { ...mockCartItem, quantity: 0 } as CartItem;
      const removeDto = { quantity: 0 } as CartItemDto;
      cartItemService.updateQuantity!.mockResolvedValue(removedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        removeDto
      );

      expect(result).toEqual(removedItem);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        0
      );
    });

    it('should default to 0 when quantity not provided', async () => {
      const removedItem = { ...mockCartItem, quantity: 0 } as CartItem;
      const emptyDto = {} as CartItemDto;
      cartItemService.updateQuantity!.mockResolvedValue(removedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        emptyDto
      );

      expect(result).toEqual(removedItem);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        0
      );
    });

    it('should handle item not found', async () => {
      const notFoundError = new NotFoundException('Cart item not found');
      cartItemService.updateQuantity!.mockRejectedValue(notFoundError);

      await expect(
        controller.updateQuantity(validStoreId, validUserId, 'nonexistent', {
          quantity: 2,
        } as CartItemDto)
      ).rejects.toThrow(NotFoundException);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        'nonexistent',
        2
      );
    });

    it('should handle negative quantity (service should validate)', async () => {
      const negativeDto = { quantity: -1 } as CartItemDto;
      const validationError = new BadRequestException(
        'Quantity cannot be negative'
      );
      cartItemService.updateQuantity!.mockRejectedValue(validationError);

      await expect(
        controller.updateQuantity(
          validStoreId,
          validUserId,
          validItemId,
          negativeDto
        )
      ).rejects.toThrow(BadRequestException);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        -1
      );
    });

    it('should handle null quantity by defaulting to 0', async () => {
      const nullQuantityDto = { quantity: null } as any;
      cartItemService.updateQuantity!.mockResolvedValue(mockCartItem);

      await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        nullQuantityDto
      );

      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        0
      );
    });
  });

  describe('inherited BaseController methods', () => {
    describe('findAll', () => {
      it('should return all cart items', async () => {
        cartItemService.findAll!.mockResolvedValue(mockCartItemList);

        const result = await controller.findAll();

        expect(result).toEqual(mockCartItemList);
        expect(cartItemService.findAll).toHaveBeenCalledTimes(1);
      });
    });

    describe('findOne', () => {
      it('should return cart item by id', async () => {
        cartItemService.findOne!.mockResolvedValue(mockCartItem);

        const result = await controller.findOne('item1');

        expect(result).toEqual(mockCartItem);
        expect(cartItemService.findOne).toHaveBeenCalledWith('item1');
      });

      it('should throw NotFoundException when item not found', async () => {
        cartItemService.findOne!.mockRejectedValue(
          new NotFoundException('Cart item not found')
        );

        await expect(controller.findOne('nonexistent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('create', () => {
      it('should create new cart item', async () => {
        cartItemService.create!.mockResolvedValue(mockCartItem);

        const result = await controller.create(mockCartItemDto);

        expect(result).toEqual(mockCartItem);
        expect(cartItemService.create).toHaveBeenCalledWith(mockCartItemDto);
      });
    });

    describe('update', () => {
      it('should update existing cart item', async () => {
        const updatedItem = { ...mockCartItem, quantity: 10 } as CartItem;
        cartItemService.update!.mockResolvedValue(updatedItem);

        const result = await controller.update('item1', mockCartItemDto);

        expect(result).toEqual(updatedItem);
        expect(cartItemService.update).toHaveBeenCalledWith(
          'item1',
          mockCartItemDto
        );
      });
    });

    describe('remove', () => {
      it('should remove cart item', async () => {
        cartItemService.remove!.mockResolvedValue(undefined);

        await controller.remove('item1');

        expect(cartItemService.remove).toHaveBeenCalledWith('item1');
      });
    });
  });

  describe('route parameter handling', () => {
    it('should accept route parameters but not pass them to service', async () => {
      cartItemService.updateQuantity!.mockResolvedValue(mockCartItem);

      await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        mockCartItemDto
      );

      // storeId and userId are for routing/authorization, not passed to service
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        mockCartItemDto.quantity
      );
    });

    it('should handle all route parameters in addOrIncrement', async () => {
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      // Only DTO is passed to service
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto
      );
      expect(cartItemService.addOrIncrement).not.toHaveBeenCalledWith(
        validStoreId,
        expect.anything()
      );
    });
  });

  describe('error handling scenarios', () => {
    it('should propagate service errors', async () => {
      const serviceError = new Error('Database connection failed');
      cartItemService.addOrIncrement!.mockRejectedValue(serviceError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(serviceError);
    });

    it('should handle database constraint errors', async () => {
      const constraintError = new BadRequestException(
        'Invalid variant for store'
      );
      cartItemService.addOrIncrement!.mockRejectedValue(constraintError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent add operations', async () => {
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      const concurrentAdds = Array.from({ length: 5 }, () =>
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      );

      const results = await Promise.all(concurrentAdds);

      expect(results).toHaveLength(5);
      expect(results.every((result) => result.id === mockCartItem.id)).toBe(
        true
      );
      expect(cartItemService.addOrIncrement).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent quantity updates', async () => {
      const quantities = [1, 2, 3, 4, 5];
      cartItemService.updateQuantity!.mockImplementation((_, qty) =>
        Promise.resolve({ ...mockCartItem, quantity: qty } as CartItem)
      );

      const concurrentUpdates = quantities.map((qty) =>
        controller.updateQuantity(validStoreId, validUserId, validItemId, {
          quantity: qty,
        } as CartItemDto)
      );

      const results = await Promise.all(concurrentUpdates);

      expect(results).toHaveLength(5);
      expect(cartItemService.updateQuantity).toHaveBeenCalledTimes(5);
      quantities.forEach((qty, index) => {
        expect(results[index].quantity).toBe(qty);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty DTO in addOrIncrement', async () => {
      const emptyDto = {} as CartItemDto;
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(validStoreId, validUserId, emptyDto);

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(emptyDto);
    });

    it('should handle DTO with only some fields', async () => {
      const partialDto = {
        cartId: 'cart1',
        variantId: 'variant1',
      } as CartItemDto;
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(validStoreId, validUserId, partialDto);

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(partialDto);
    });
  });
});
