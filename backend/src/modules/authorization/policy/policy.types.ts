import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

export type PolicyEntry = {
  /**
   * When set, route requires site-admin (AdminRoles.ADMIN) or other AdminRoles.
   * If missing, this check is skipped.
   */
  adminRole?: AdminRoles;

  /**
   * When set, route requires any of the given store roles for the target store.
   * E.g. [StoreRoles.ADMIN] means the user must be a store-admin for the store param.
   */
  storeRoles?: StoreRoles[];

  /**
   * Optional: if true, require that the user is authenticated (req.user must exist).
   */
  requireAuthenticated?: boolean;
};

export type AccessPolicies = Record<string, PolicyEntry>;
