import { AiAudit } from 'src/entities/ai/ai-audit.entity';
import { AuditStats } from 'src/common/interfaces/ai/audit.interface';

export interface StoreEncryptedResponseParams {
  feature: string;
  provider?: string | null;
  model?: string | null;
  rawResponse: any;
  userId?: string | null;
  storeId?: string | null;
}

export interface DecryptedAuditResponse {
  audit: AiAudit;
  decryptedResponse: any;
  decryptionTime: number;
}

export interface EncryptionIntegrityResult {
  totalChecked: number;
  validEntries: number;
  corruptedEntries: number;
  healthPercentage: number;
}

export interface AuditFilterOptions {
  storeId?: string;
  userId?: string;
  feature?: string;
  provider?: string;
  model?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export type AuditStatsFilterOptions = Omit<AuditFilterOptions, 'model'>;

export interface SuspiciousActivityReport {
  suspiciousAudits: AiAudit[];
  securityMetrics: {
    totalDecryptionAttempts: number;
    failedDecryptionAttempts: number;
    unusualPatterns: Array<{ pattern: string; count: number }>;
  };
}
export interface IntegrityCheckReport {
  overallHealth: number;
  detailedResults: {
    totalChecked: number;
    validEntries: number;
    corruptedEntries: number;
    healthPercentage: number;
  };
  recommendations: string[];
}

export interface ComplianceReport {
  samples?: DecryptedAuditResponse[];
  reportId: string;
  period: { from: Date; to: Date };
  summary: {
    totalAudits: number;
    byFeature: Record<string, number>;
    byProvider: Record<string, number>;
    encryptionHealth: number;
  };
  compliance: {
    dataRetention: {
      status: string;
      details: string;
      stats: AuditStats;
    };
    encryption: {
      status: string;
      details: string;
    };
    access: {
      status: string;
      details: string;
      stats: AuditStats;
    };
  };
}

export interface PreparedResponseData {
  data: any;
  metadata: {
    encryptedAt: string;
    version: string;
    checksum: string;
  };
}
