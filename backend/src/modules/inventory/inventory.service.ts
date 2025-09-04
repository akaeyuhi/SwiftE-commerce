import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRepository } from 'src/modules/inventory/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async getQuantity(variantId: string) {
    const inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
    });
    return inv ? inv.quantity : 0;
  }

  async adjust(variantId: string, delta: number) {
    const inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
      lock: { mode: 'pessimistic_write' },
    });
    if (!inv) throw new NotFoundException('Inventory not found');
    inv.quantity += delta;
    if (inv.quantity < 0) throw new Error('Insufficient stock');
    return this.inventoryRepo.save(inv);
  }

  async set(variantId: string, qty: number) {
    let inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
    });
    if (!inv) {
      inv = this.inventoryRepo.create({
        variant: { id: variantId } as any,
        quantity: qty,
      });
    } else {
      inv.quantity = qty;
    }
    return this.inventoryRepo.save(inv);
  }
}
