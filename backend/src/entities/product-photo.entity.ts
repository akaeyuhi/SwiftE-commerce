import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'product_photos' })
export class ProductPhoto {
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
}
