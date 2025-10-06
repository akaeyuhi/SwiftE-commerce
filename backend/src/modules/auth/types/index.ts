import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';

export interface JwtPayload {
  id: string;
  email: string;
  sub?: string;
  isVerified?: boolean;
}

export interface ConfirmationStatus {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
    emailVerifiedAt?: Date;
  };
  pendingConfirmations: {
    accountVerification: boolean;
    roleAssignments: Array<{
      type: ConfirmationType;
      metadata?: Record<string, any>;
      expiresAt: Date;
      timeRemaining: string;
    }>;
  };
  activeRoles: {
    siteAdmin: boolean;
    storeRoles: Array<{
      storeId: string;
      storeName?: string;
      role: string;
      assignedAt: Date;
    }>;
  };
}

export interface ConfirmationResult {
  success: boolean;
  message: string;
  type: ConfirmationType;
  user?: any;
  activeRoles?: any;
}
