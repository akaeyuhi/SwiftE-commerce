import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';
import { Store } from 'src/entities/store/store.entity';

export interface StoreOwnedEntity extends BaseEntity {
  store: Store;
}
