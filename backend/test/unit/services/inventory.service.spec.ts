import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { InventoryRepository } from 'src/modules/store/inventory/inventory.repository';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { createRepositoryMock, MockedMethods } from '../utils/helpers';
import { NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: Partial<MockedMethods<InventoryRepository>>;

  const mockInv: Inventory = {
    id: 'i1',
    variant: { id: 'v1' } as any,
    quantity: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    repo = createRepositoryMock<InventoryRepository>([
      'findOne',
      'save',
      'create',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('getQuantity', () => {
    it('returns 0 when none found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.getQuantity('v1')).resolves.toBe(0);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
      });
    });

    it('returns quantity when found', async () => {
      repo.findOne!.mockResolvedValue(mockInv);
      await expect(service.getQuantity('v1')).resolves.toBe(5);
    });
  });

  describe('adjust', () => {
    it('throws NotFoundException when missing', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.adjust('v1', 1)).rejects.toThrow(NotFoundException);
    });

    it('throws Error on insufficient stock', async () => {
      repo.findOne!.mockResolvedValue({ ...mockInv, quantity: 2 });
      await expect(service.adjust('v1', -3)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('saves updated inventory', async () => {
      const inv = { ...mockInv, quantity: 5 };
      repo.findOne!.mockResolvedValue(inv);
      repo.save!.mockResolvedValue({ ...inv, quantity: 7 });
      const res = await service.adjust('v1', 2);
      expect(inv.quantity).toBe(7); // mutated before save
      expect(repo.save).toHaveBeenCalledWith(inv);
      expect(res.quantity).toBe(7);
    });
  });

  describe('set', () => {
    it('creates new record when none exists', async () => {
      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue({
        variant: { id: 'v1' },
        quantity: 3,
      } as any);
      repo.save!.mockResolvedValue({
        id: 'i2',
        variant: { id: 'v1' } as any,
        quantity: 3,
      } as any);

      const res = await service.set('v1', 3);
      expect(repo.create).toHaveBeenCalledWith({
        variant: { id: 'v1' },
        quantity: 3,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(res.quantity).toBe(3);
    });

    it('updates existing record', async () => {
      const inv = { ...mockInv };
      repo.findOne!.mockResolvedValue(inv);
      repo.save!.mockResolvedValue({ ...inv, quantity: 10 });
      const res = await service.set('v1', 10);
      expect(inv.quantity).toBe(10);
      expect(repo.save).toHaveBeenCalledWith(inv);
      expect(res.quantity).toBe(10);
    });
  });

  describe('findInventoryByVariantId', () => {
    it('delegates to repo.findOne', async () => {
      repo.findOne!.mockResolvedValue(mockInv);
      const res = await service.findInventoryByVariantId('v1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
      });
      expect(res).toEqual(mockInv);
    });
  });
});
