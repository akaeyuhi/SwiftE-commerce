import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { OrderItem } from './order-item.entity';
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/store-owned.entity.interface';
import { OrderInfo } from 'src/common/embeddables/order-info.embeddable';

/**
 * Order
 *
 * Represents a placed order belonging to a user and a store. The order stores
 * an embedded shipping and (optionally) billing address snapshot so historical
 * data doesn't depend on later user profile changes.
 */
@Entity({ name: 'orders' })
export class Order implements UserOwnedEntity, StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Store, (store) => store.orders, { onDelete: 'CASCADE' })
  store: Store;

  /**
   * Order status. You may want to convert this to an enum in code.
   * Examples: 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'
   */
  @Column({ type: 'varchar', length: 50 })
  status: string;

  /**
   * Monetary total for the order (currency handled at application level).
   * Use numeric for precise decimal storage (Postgres).
   */
  @Column({ type: 'numeric' })
  totalAmount: number;

  /**
   * Embedded shipping information snapshot for this order.
   * Columns will be named like `shippingFirstName` unless you prefer a prefix.
   */
  @Column(() => OrderInfo)
  shipping: OrderInfo;

  /**
   * Optional embedded billing info. If omitted, billing may equal shipping.
   */
  @Column(() => OrderInfo)
  billing?: OrderInfo;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
