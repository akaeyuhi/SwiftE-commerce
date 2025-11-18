import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { Review } from 'src/entities/store/review.entity';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'products' })
@Index(['storeId', 'deletedAt'])
@Index(['storeId', 'createdAt'])
@Index(['name'])
export class Product implements StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.products, { onDelete: 'CASCADE' })
  @ApiProperty({
    type: () => Store,
    required: false,
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @ManyToMany(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  @ApiProperty({
    type: () => [Category],
    required: false,
  })
  categories: Category[];

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Cached statistics for performance
  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  averageRating?: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  totalSales: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'varchar', nullable: true })
  mainPhotoUrl: string;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  @OneToMany(() => ProductPhoto, (photo) => photo.product, {
    cascade: ['update', 'remove'],
  })
  photos: ProductPhoto[];

  @OneToMany(() => Review, (review) => review.product, {
    cascade: ['update', 'remove'],
  })
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Soft delete
  @DeleteDateColumn()
  deletedAt?: Date;
}
