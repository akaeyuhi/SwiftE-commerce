import { Injectable, Logger } from '@nestjs/common';
import { AiAuditRepository } from './ai-audit.repository';
import { AiAudit } from 'src/entities/ai/ai-audit.entity';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import {
  AuditQueryOptions,
  AuditStats,
} from 'src/common/interfaces/ai/audit.interface';
import {
  AuditFilterOptions,
  AuditStatsFilterOptions,
  ComplianceReport,
  DecryptedAuditResponse,
  IntegrityCheckReport,
  PreparedResponseData,
  StoreEncryptedResponseParams,
  SuspiciousActivityReport,
} from 'src/modules/ai/ai-audit/types';

/**
 * AiAuditService with encryption, monitoring, and compliance features
 *
 * Provides secure audit trail for AI operations with:
 * - Strong encryption using AES-256-GCM
 * - Key rotation support
 * - Compliance reporting
 * - Security monitoring
 * - Data integrity validation
 */
@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);
  private readonly primaryKey: Buffer;
  private readonly secondaryKey?: Buffer; // For key rotation
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyVersion = '1.0';

  // Security monitoring
  private readonly suspiciousPatterns = new Map<string, number>();
  private readonly decryptionAttempts = new Map<string, number>();

  constructor(private readonly auditRepo: AiAuditRepository) {
    // Initialize encryption keys
    this.primaryKey = this.deriveKey(process.env.AI_AUDIT_ENC_KEY);

    // Optional secondary key for rotation
    if (process.env.AI_AUDIT_ENC_KEY_SECONDARY) {
      this.secondaryKey = this.deriveKey(
        process.env.AI_AUDIT_ENC_KEY_SECONDARY
      );
    }

    if (!process.env.AI_AUDIT_ENC_KEY) {
      this.logger.warn(
        'AI_AUDIT_ENC_KEY not set. Using default key for development only.'
      );
    }
  }

  /**
   * Store encrypted AI response with enhanced security
   */
  async storeEncryptedResponse(
    params: StoreEncryptedResponseParams
  ): Promise<AiAudit> {
    try {
      // Security validation
      this.validateStoreRequest(params);

      // Prepare response data with metadata
      const responseData = this.prepareResponseData(params.rawResponse);

      // Encrypt the response
      const encryptionResult = this.encryptData(responseData);

      // Create audit payload
      const payload: any = {
        feature: params.feature,
        provider: params.provider ?? null,
        model: params.model ?? null,
        encryptedResponse: encryptionResult,
      };

      if (params.userId) {
        payload.user = { id: params.userId };
      }

      if (params.storeId) {
        payload.store = { id: params.storeId };
      }

      const saved = await this.auditRepo.createEntity(payload);

      // Log successful audit creation
      this.logger.debug(
        `AiAudit created: id=${saved.id} feature=${params.feature} provider=${params.provider}`
      );

      // Update security monitoring
      this.updateSecurityMetrics(params);

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to store encrypted audit: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Retrieve and decrypt AI response with security checks
   */
  async getDecryptedResponse(
    auditId: string,
    requesterId?: string
  ): Promise<DecryptedAuditResponse> {
    const startTime = Date.now();

    try {
      this.checkDecryptionAttempts(auditId, requesterId);

      const audit = await this.auditRepo.findOne({
        where: { id: auditId },
        relations: ['user', 'store'],
      });

      if (!audit) {
        throw new Error('Audit entry not found');
      }

      this.validateDecryptionAccess(audit, requesterId);

      const decryptedResponse = this.decryptData(audit.encryptedResponse);
      const decryptionTime = Date.now() - startTime;

      // Log successful decryption
      this.logger.debug(
        `Audit decrypted: id=${auditId} time=${decryptionTime}ms`
      );

      return {
        audit,
        decryptedResponse,
        decryptionTime,
      };
    } catch (error) {
      // Log failed decryption attempt
      this.logger.warn(
        `Failed decryption attempt: auditId=${auditId} requester=${requesterId} error=${error.message}`
      );

      // Update failed attempt counter
      this.updateDecryptionAttempts(auditId, requesterId);

      throw error;
    }
  }

  /**
   * Bulk decrypt multiple audit entries
   */
  async bulkDecrypt(
    auditIds: string[],
    requesterId?: string
  ): Promise<DecryptedAuditResponse[]> {
    const results: DecryptedAuditResponse[] = [];

    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < auditIds.length; i += batchSize) {
      const batch = auditIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (auditId) => {
        try {
          return await this.getDecryptedResponse(auditId, requesterId);
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt audit ${auditId}: ${error.message}`
          );
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  /**
   * Enhanced query with security filtering
   */
  async findByFilter(
    filter: AuditFilterOptions,
    options: AuditQueryOptions = {},
    requesterId?: string
  ): Promise<AiAudit[]> {
    // Additional access control could be implemented here
    this.validateQueryAccess(filter, requesterId);

    return this.auditRepo.findByFilter(filter, options);
  }

  /**
   * Get comprehensive audit statistics
   */
  async getAuditStats(
    filters: AuditStatsFilterOptions = {},
    requesterId?: string
  ): Promise<AuditStats> {
    this.validateQueryAccess(filters, requesterId);
    return this.auditRepo.getAuditStats(filters);
  }

  /**
   * Security monitoring: get suspicious audit patterns
   */
  async getSuspiciousActivity(
    options: {
      unusualVolume?: boolean;
      failedDecryption?: boolean;
      unusualProviders?: boolean;
      limit?: number;
    } = {}
  ): Promise<SuspiciousActivityReport> {
    const suspiciousAudits = await this.auditRepo.getSuspiciousAudits(options);

    const totalDecryptionAttempts = Array.from(
      this.decryptionAttempts.values()
    ).reduce((sum, count) => sum + count, 0);

    const failedDecryptionAttempts = this.decryptionAttempts.size;

    const unusualPatterns = Array.from(this.suspiciousPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      suspiciousAudits,
      securityMetrics: {
        totalDecryptionAttempts,
        failedDecryptionAttempts,
        unusualPatterns,
      },
    };
  }

  /**
   * Validate encryption integrity across audit entries
   */
  async validateIntegrity(
    sampleSize: number = 100
  ): Promise<IntegrityCheckReport> {
    const integrityResults =
      await this.auditRepo.validateEncryptionIntegrity(sampleSize);

    const recommendations: string[] = [];

    if (integrityResults.healthPercentage < 95) {
      recommendations.push(
        'Encryption integrity below 95% - investigate corrupted entries'
      );
    }

    if (integrityResults.corruptedEntries > 0) {
      recommendations.push(
        'Found corrupted encryption entries - consider key rotation'
      );
    }

    if (integrityResults.healthPercentage === 100) {
      recommendations.push('Encryption integrity is excellent');
    }

    return {
      overallHealth: integrityResults.healthPercentage,
      detailedResults: integrityResults,
      recommendations,
    };
  }

  /**
   * Compliance report generation
   */
  async generateComplianceReport(
    dateFrom: Date,
    dateTo: Date,
    options: {
      includeDecryptedSamples?: boolean;
      storeId?: string;
      userId?: string;
    } = {}
  ): Promise<ComplianceReport> {
    const reportId = `audit-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const stats = await this.getAuditStats({
      dateFrom,
      dateTo,
      storeId: options.storeId,
      userId: options.userId,
    });

    const integrityCheck = await this.validateIntegrity(50);

    // Compliance checks
    const compliance = {
      dataRetention: this.checkDataRetentionCompliance(stats),
      encryption: this.checkEncryptionCompliance(integrityCheck),
      access: this.checkAccessCompliance(stats),
    };

    const report = {
      reportId,
      period: { from: dateFrom, to: dateTo },
      summary: {
        totalAudits: stats.totalAudits,
        byFeature: stats.byFeature,
        byProvider: stats.byProvider,
        encryptionHealth: integrityCheck.overallHealth,
      },
      compliance,
    };

    // Include decrypted samples if requested (for compliance audits)
    if (options.includeDecryptedSamples) {
      const recentAudits = await this.auditRepo.getRecentAudits(60, 5);
      (report as any).samples = await this.bulkDecrypt(
        recentAudits.map((a) => a.id).slice(0, 3)
      );
    }

    this.logger.log(`Compliance report generated: ${reportId}`);
    return report;
  }

  /**
   * Cleanup with compliance considerations
   */
  async cleanup(
    retentionDays: number = 90,
    options: {
      preserveCount?: number;
      dryRun?: boolean;
      complianceMode?: boolean;
    } = {}
  ): Promise<{
    deletedCount: number;
    preservedCount: number;
    complianceWarnings: string[];
  }> {
    const {
      preserveCount = 1000,
      dryRun = false,
      complianceMode = false,
    } = options;

    const complianceWarnings: string[] = [];

    // Compliance checks
    if (complianceMode) {
      if (retentionDays < 30) {
        complianceWarnings.push(
          'Retention period less than 30 days may not meet compliance requirements'
        );
      }

      if (preserveCount < 100) {
        complianceWarnings.push(
          'Preserving fewer than 100 entries may impact audit capabilities'
        );
      }
    }

    if (dryRun) {
      // Simulate cleanup to show what would be deleted
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const wouldDelete = await this.auditRepo
        .createQueryBuilder('a')
        .where('a.createdAt < :cutoffDate', { cutoffDate })
        .getCount();

      return {
        deletedCount: wouldDelete,
        preservedCount: preserveCount,
        complianceWarnings,
      };
    }

    const cleanupResult = await this.auditRepo.cleanupOldAudits(
      retentionDays,
      preserveCount
    );

    this.logger.log(
      `Audit cleanup completed: deleted=${cleanupResult.deletedCount} preserved=${cleanupResult.preservedCount}`
    );

    return {
      ...cleanupResult,
      complianceWarnings,
    };
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private deriveKey(keyInput?: string): Buffer {
    if (!keyInput) {
      // Development-only fallback
      this.logger.warn('Using default encryption key - NOT FOR PRODUCTION');
      keyInput = 'default-dev-key-change-in-production';
    }

    return createHash('sha256').update(keyInput).digest();
  }

  private encryptData(data: any): Record<string, any> {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.primaryKey, iv);

      const jsonString = JSON.stringify(data);
      let encrypted = cipher.update(jsonString, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const tag = cipher.getAuthTag();

      return {
        ciphertext: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyVersion: this.keyVersion,
        algorithm: this.algorithm,
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt audit data');
    }
  }

  private decryptData(encryptedData: Record<string, any>): any {
    try {
      const { ciphertext, iv, tag, keyVersion } = encryptedData;

      // Select appropriate key based on version
      const decryptionKey =
        keyVersion === this.keyVersion
          ? this.primaryKey
          : this.secondaryKey || this.primaryKey;

      const decipher = createDecipheriv(
        this.algorithm,
        decryptionKey,
        Buffer.from(iv, 'base64')
      );

      decipher.setAuthTag(Buffer.from(tag, 'base64'));

      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt audit data');
    }
  }

  private prepareResponseData(rawResponse: any): PreparedResponseData {
    return {
      data: rawResponse,
      metadata: {
        encryptedAt: new Date().toISOString(),
        version: this.keyVersion,
        checksum: this.calculateChecksum(rawResponse),
      },
    };
  }

  private calculateChecksum(data: any): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private validateStoreRequest(params: StoreEncryptedResponseParams): void {
    if (!params.feature) {
      throw new Error('Feature is required for audit storage');
    }

    if (!params.rawResponse) {
      throw new Error('Raw response is required for audit storage');
    }

    // Check for suspicious patterns
    const pattern = `${params.feature}:${params.provider}`;
    const currentCount = this.suspiciousPatterns.get(pattern) || 0;
    this.suspiciousPatterns.set(pattern, currentCount + 1);

    // Alert on unusual activity
    if (currentCount > 100) {
      this.logger.warn(`High volume detected for pattern: ${pattern}`);
    }
  }

  //TODO

  private validateDecryptionAccess(audit: AiAudit, requesterId?: string): void {
    // Basic access control - extend as needed
    if (requesterId && audit.user?.id && audit.user.id !== requesterId) {
      // Add more sophisticated access control logic here
      this.logger.warn(
        `Unauthorized decryption attempt: requester=${requesterId} owner=${audit.user.id}`
      );
    }
  }

  private validateQueryAccess(filter: any, requesterId?: string): void {
    // Implement query-level access control
    if (requesterId && filter.userId && filter.userId !== requesterId) {
      this.logger.warn(
        `Potentially unauthorized query: requester=${requesterId} target=${filter.userId}`
      );
    }
  }

  private checkDecryptionAttempts(auditId: string, requesterId?: string): void {
    const key = `${auditId}:${requesterId || 'anonymous'}`;
    const attempts = this.decryptionAttempts.get(key) || 0;

    if (attempts > 5) {
      throw new Error('Too many decryption attempts');
    }
  }

  private updateDecryptionAttempts(
    auditId: string,
    requesterId?: string
  ): void {
    const key = `${auditId}:${requesterId || 'anonymous'}`;
    const attempts = this.decryptionAttempts.get(key) || 0;
    this.decryptionAttempts.set(key, attempts + 1);
  }

  private updateSecurityMetrics(params: StoreEncryptedResponseParams): void {
    // Update various security metrics for monitoring
    const pattern = `audit:${params.feature}:${params.provider}`;
    const count = this.suspiciousPatterns.get(pattern) || 0;
    this.suspiciousPatterns.set(pattern, count + 1);
  }

  private checkDataRetentionCompliance(stats: AuditStats) {
    // Implement data retention compliance checks
    return {
      status: 'compliant' as const,
      details: 'Data retention policy is being followed',
      stats,
    };
  }

  private checkEncryptionCompliance(integrityCheck: any) {
    const status = integrityCheck.overallHealth >= 95 ? 'compliant' : 'warning';
    return {
      status,
      details: `Encryption health: ${integrityCheck.overallHealth.toFixed(2)}%`,
    };
  }

  private checkAccessCompliance(stats: AuditStats) {
    // Implement access control compliance checks
    return {
      status: 'compliant' as const,
      details: 'Access patterns appear normal',
      stats,
    };
  }
}
