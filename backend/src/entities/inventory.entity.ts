import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from './variant.entity';
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';

// TODO
/**
 *
 * Think on the refactoring Inventory entity
 * Inventory belongs to the store, inventory has product variants with set quantity.
 * Do we need separate rows for each variant, or one inventory per store?
 *
 */
@Entity({ name: 'inventory' })
export class Inventory implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.inventory, {
    onDelete: 'CASCADE',
  })
  variant: ProductVariant;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestockedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
