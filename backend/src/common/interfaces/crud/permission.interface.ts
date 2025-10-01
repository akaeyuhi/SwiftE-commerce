import { ResourcesEnum } from 'src/common/enums/resources.enum';
import { CrudActionEnum } from 'src/common/enums/crud-action.enum';

export interface Permission {
  resource: ResourcesEnum;
  action: CrudActionEnum;
  scope?: 'global' | 'store';
}
