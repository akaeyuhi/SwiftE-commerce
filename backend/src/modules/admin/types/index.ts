export interface FormattedAdmin {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    isEmailVerified: boolean;
  };
  assignedBy?: string;
  assignedAt?: Date;
  revokedBy?: string;
  revokedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AdminStats {
  total: number;
  active: number;
  inactive: number;
  recentAssignments: number;
  trends: {
    assignmentsByMonth: Record<string, number>;
  };
}

export interface AdminSearchResult {
  searchQuery: string;
  results: FormattedAdmin[];
  count: number;
}
