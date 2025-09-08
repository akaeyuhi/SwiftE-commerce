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
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';

//TODO
// Write an embedded class for order info like shipping address etc
@Entity({ name: 'orders' })
export class Order implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Store, (store) => store.orders, { onDelete: 'CASCADE' })
  store: Store;

  @Column({ type: 'varchar', length: 100 })
  status: string; // e.g., 'pending', 'shipped', 'cancelled'

  @Column({ type: 'numeric' })
  totalAmount: number;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
