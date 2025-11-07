import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';

@Entity({ name: 'inventory' })
export class Inventory implements StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId: string;

  @OneToOne(() => ProductVariant, (variant) => variant.inventory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id', referencedColumnName: 'id' })
  variant: ProductVariant;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.inventories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
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
