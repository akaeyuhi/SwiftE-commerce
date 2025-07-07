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
