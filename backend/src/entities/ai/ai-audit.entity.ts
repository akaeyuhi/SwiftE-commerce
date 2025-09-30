import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';

@Entity({ name: 'ai_audits' })
export class AiAudit implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.aiLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: User;

  @ManyToOne(() => Store, (s) => s.aiLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  store?: Store;

  /**
   * The feature that triggered generation: e.g. 'generator-name', 'generator-idea', 'predictor'
   */
  @Column({ type: 'varchar', length: 100 })
  feature: string;

  /**
   * Provider identifier (e.g. 'hf', 'openai', 'predictor-service')
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  provider?: string;

  /**
   * model name used (optional)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  model?: string;

  /**
   * Encrypted raw provider response (JSON blob encrypted).
   * Structure: { ciphertext: string (base64), iv: string(base64), tag: string(base64) } stored as JSONB.
   */
  @Column({ type: 'jsonb' })
  encryptedResponse: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
