import { BaseEntity } from 'src/common/interfaces/base-entity.interface';
import { Store } from 'src/entities/store.entity';

export interface StoreOwnedEntity extends BaseEntity {
  store: Store;
}
