import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from 'src/entities/store/variant.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreOwnedEntity } from 'src/common/interfaces/store-owned.entity.interface';

// TODO
/**
 *
 * Think on the refactoring Inventory entity
 * Inventory belongs to the store, inventory has product variants with set quantity.
 * Do we need separate rows for each variant, or one inventory per store?
 *
 */
@Entity({ name: 'inventory' })
export class Inventory implements StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.inventories, {
    onDelete: 'CASCADE',
  })
  variant: ProductVariant;

  @ManyToOne(() => Store, (store) => store.inventories, { onDelete: 'CASCADE' })
  store: Store;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestockedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
