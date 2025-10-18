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
  Unique,
} from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';

@Entity({ name: 'categories' })
@Unique(['name'])
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
  store: Store;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
    orphanedRowAction: 'delete',
  })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @ManyToMany(() => Product, (product) => product.categories)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'category_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumnName: 'id' },
  })
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
