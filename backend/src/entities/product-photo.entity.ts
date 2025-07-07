import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';

@Entity({ name: 'product_photos' })
export class ProductPhoto implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.photos, {
    onDelete: 'CASCADE',
  })
  product: Product;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', nullable: true })
  altText?: string;

  @Column({ type: 'boolean', default: false })
  isMain: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
