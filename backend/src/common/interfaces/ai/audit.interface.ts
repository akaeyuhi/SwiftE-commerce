export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AuditStats {
  totalAudits: number;
  byFeature: Record<string, number>;
  byProvider: Record<string, number>;
  byUser: Record<string, number>;
  byStore: Record<string, number>;
  dailyBreakdown: Array<{ date: string; count: number }>;
  averageResponseSize: number;
  encryptionHealth: {
    totalEncrypted: number;
    corruptedEntries: number;
    healthPercentage: number;
  };
}
