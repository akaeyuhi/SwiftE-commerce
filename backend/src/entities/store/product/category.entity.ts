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
} from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'categories' })
export class Category implements StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'storeId', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.categories, { onDelete: 'CASCADE' })
  @ApiProperty({
    type: () => Store,
    required: false,
  })
  store: Store;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
    orphanedRowAction: 'delete',
  })
  @ApiProperty({
    type: () => Category,
    required: false,
  })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  @ApiProperty({
    type: () => [Category],
    required: false,
  })
  children: Category[];

  @ManyToMany(() => Product, (product) => product.categories)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'category_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumnName: 'id' },
  })
  @ApiProperty({
    type: () => [Product],
    required: false,
  })
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
