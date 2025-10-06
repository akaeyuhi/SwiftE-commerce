import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';
import { OrderInfo } from 'src/common/embeddables/order-info.embeddable';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Entity({ name: 'orders' })
@Index(['userId', 'status', 'createdAt'])
@Index(['storeId', 'status', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['createdAt'])
export class Order implements UserOwnedEntity, StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.orders, { onDelete: 'CASCADE' })
  store: Store;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  totalAmount: number;

  @Column(() => OrderInfo, { prefix: 'shipping_' })
  shipping: OrderInfo;

  @Column(() => OrderInfo, { prefix: 'billing_' })
  billing?: OrderInfo;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
