import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Predictor entity - stores model predictions and feature snapshot.
 * Adjust fields to match your DB schema (jsonb maps assumed).
 */
@Entity({ name: 'predictor_stats' })
export class PredictorStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  scope: 'product' | 'store' | 'global';

  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'jsonb', nullable: true })
  features?: any;

  @Column({ type: 'jsonb', nullable: true })
  prediction?: any;

  @Column({ type: 'varchar', length: 64, nullable: true })
  modelVersion?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
