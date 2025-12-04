import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Read-Only Review Entity
 * Maps to the existing 'reviews' table.
 * Stripped of 'ManyToOne' relations to User/Product to avoid dependency chains.
 */
@Entity({ name: 'reviews', synchronize: false })
export class Review {
  @PrimaryColumn('uuid')
  id: string;

  // We map the foreign key column directly to a string
  // instead of loading the entire User entity object.
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  // Kept these for potential future Sentiment Analysis (NLP),
  // but they are not strictly needed for numerical stats.
  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;
}
