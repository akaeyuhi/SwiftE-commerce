import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * AiStat
 *
 * Stores AI-generated insights / suggestions for a store or product so they can be shown
 * in admin UI and audited later. `scope` = 'store' | 'product'
 */
@Entity({ name: 'ai_stats' })
export class AiStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  scope: 'store' | 'product';

  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'jsonb' })
  features: Record<string, any>; // features used by model for audit

  @Column({ type: 'jsonb' })
  prediction: Record<string, any>; // model output, e.g. { trend: 'up', score: 0.87, reasons: [...] }

  @Column({ type: 'varchar', length: 64, nullable: true })
  modelVersion?: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
