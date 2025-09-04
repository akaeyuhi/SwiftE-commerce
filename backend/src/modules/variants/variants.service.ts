import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRepository } from 'src/modules/inventory/inventory.repository';
import { VariantsRepository } from 'src/modules/variants/variants.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { ProductVariant } from 'src/entities/variant.entity';
import { CreateVariantDto } from 'src/modules/variants/dto/create-variant.dto';
import { UpdateVariantDto } from 'src/modules/variants/dto/update-variant.dto';

@Injectable()
export class VariantsService extends BaseService<
  ProductVariant,
  CreateVariantDto,
  UpdateVariantDto
> {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly variantRepo: VariantsRepository
  ) {
    super(variantRepo);
  }

  async updatePrice(variantId: string, price: number) {
    const v = await this.variantRepo.findOneBy({ id: variantId });
    if (!v) throw new NotFoundException('Variant not found');
    v.price = price;
    return this.variantRepo.save(v);
  }

  async setInventory(variantId: string, qty: number) {
    // either update Inventory table or variant.stock
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

  async adjustInventory(variantId: string, delta: number) {
    const inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
      lock: { mode: 'pessimistic_write' },
    });
    if (!inv) throw new NotFoundException('Inventory not found');
    inv.quantity += delta;
    if (inv.quantity < 0) throw new Error('Insufficient stock');
    return this.inventoryRepo.save(inv);
  }
}
