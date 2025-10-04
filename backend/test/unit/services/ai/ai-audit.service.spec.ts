import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { AiAuditRepository } from 'src/modules/ai/ai-audit/ai-audit.repository';
import { AiAudit } from 'src/entities/ai/ai-audit.entity';
import { createRepositoryMock, MockedMethods } from '../../../utils/helpers';
/* eslint-disable camelcase */
function expectArrayToContainString(array: string[], substring: string) {
  expect(array.some((item) => item.includes(substring))).toBe(true);
}

describe('AiAuditService', () => {
  let service: AiAuditService;
  let auditRepo: Partial<MockedMethods<AiAuditRepository>>;

  const mockAudit: AiAudit = {
    id: 'audit1',
    feature: 'description_generator',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    encryptedResponse: {
      ciphertext: 'encrypted-data',
      iv: 'initialization-vector',
      tag: 'auth-tag',
      keyVersion: '1.0',
      algorithm: 'aes-256-gcm',
    },
    user: { id: 'u1' } as any,
    store: { id: 's1' } as any,
    createdAt: new Date(),
  } as unknown as AiAudit;

  beforeEach(async () => {
    // Set encryption key for testing
    process.env.AI_AUDIT_ENC_KEY = 'test-encryption-key-for-unit-tests';

    auditRepo = createRepositoryMock<AiAuditRepository>([
      'createEntity',
      'findOne',
      'findByFilter',
      'getAuditStats',
      'getSuspiciousAudits',
      'validateEncryptionIntegrity',
      'getRecentAudits',
      'cleanupOldAudits',
      'createQueryBuilder',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAuditService,
        { provide: AiAuditRepository, useValue: auditRepo },
      ],
    }).compile();

    service = module.get<AiAuditService>(AiAuditService);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.AI_AUDIT_ENC_KEY;
  });

  describe('initialization', () => {
    it('should initialize with encryption keys', () => {
      expect(service).toBeDefined();
      expect((service as any).primaryKey).toBeDefined();
      expect((service as any).algorithm).toBe('aes-256-gcm');
    });

    it('should warn when encryption key not set', async () => {
      delete process.env.AI_AUDIT_ENC_KEY;

      // Clear previous spy
      jest.clearAllMocks();

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Create new module without encryption key
      await Test.createTestingModule({
        providers: [
          AiAuditService,
          { provide: AiAuditRepository, useValue: auditRepo },
        ],
      }).compile();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI_AUDIT_ENC_KEY')
      );
    });
  });

  describe('storeEncryptedResponse', () => {
    it('should store encrypted audit successfully', async () => {
      const params = {
        feature: 'description_generator',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        rawResponse: { text: 'Generated description' },
        userId: 'u1',
        storeId: 's1',
      };

      auditRepo.createEntity!.mockResolvedValue(mockAudit);

      const result = await service.storeEncryptedResponse(params);

      expect(result).toEqual(mockAudit);
      expect(auditRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'description_generator',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          encryptedResponse: expect.objectContaining({
            ciphertext: expect.any(String),
            iv: expect.any(String),
            tag: expect.any(String),
            keyVersion: '1.0',
            algorithm: 'aes-256-gcm',
          }),
        })
      );
    });

    it('should encrypt response data', async () => {
      const params = {
        feature: 'test_feature',
        rawResponse: { test: 'data', nested: { value: 123 } },
      };

      auditRepo.createEntity!.mockResolvedValue(mockAudit);

      await service.storeEncryptedResponse(params);

      const callArg = (auditRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.encryptedResponse.ciphertext).toBeDefined();
      expect(callArg.encryptedResponse.iv).toBeDefined();
      expect(callArg.encryptedResponse.tag).toBeDefined();
    });

    it('should handle userId and storeId', async () => {
      const params = {
        feature: 'test',
        rawResponse: { data: 'test' },
        userId: 'u1',
        storeId: 's1',
      };

      auditRepo.createEntity!.mockResolvedValue(mockAudit);

      await service.storeEncryptedResponse(params);

      expect(auditRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 'u1' },
          store: { id: 's1' },
        })
      );
    });

    it('should throw error when feature is missing', async () => {
      const params = {
        feature: '',
        rawResponse: { data: 'test' },
      };

      await expect(service.storeEncryptedResponse(params)).rejects.toThrow(
        'Feature is required'
      );
    });

    it('should throw error when rawResponse is missing', async () => {
      const params = {
        feature: 'test',
        rawResponse: null,
      } as any;

      await expect(service.storeEncryptedResponse(params)).rejects.toThrow(
        'Raw response is required'
      );
    });

    it('should update security metrics', async () => {
      const params = {
        feature: 'test_feature',
        provider: 'test_provider',
        rawResponse: { data: 'test' },
      };

      auditRepo.createEntity!.mockResolvedValue(mockAudit);

      await service.storeEncryptedResponse(params);

      const suspiciousPatterns = (service as any).suspiciousPatterns;
      expect(suspiciousPatterns.size).toBeGreaterThan(0);
    });

    it('should warn on high volume patterns', async () => {
      const params = {
        feature: 'high_volume_feature',
        provider: 'provider',
        rawResponse: { data: 'test' },
      };

      auditRepo.createEntity!.mockResolvedValue(mockAudit);

      // Simulate high volume
      const pattern = `${params.feature}:${params.provider}`;
      (service as any).suspiciousPatterns.set(pattern, 101);

      await service.storeEncryptedResponse(params);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('High volume detected')
      );
    });
  });

  describe('getDecryptedResponse', () => {
    it('should decrypt audit response successfully', async () => {
      // First encrypt some data
      const originalData = { text: 'Test response', score: 0.95 };
      const encrypted = (service as any).encryptData(
        (service as any).prepareResponseData(originalData)
      );

      const auditWithEncrypted = {
        ...mockAudit,
        encryptedResponse: encrypted,
      };

      auditRepo.findOne!.mockResolvedValue(auditWithEncrypted);

      const result = await service.getDecryptedResponse('audit1', 'u1');

      expect(result.audit).toEqual(auditWithEncrypted);
      expect(result.decryptedResponse.data).toEqual(originalData);
      expect(result.decryptionTime).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when audit not found', async () => {
      auditRepo.findOne!.mockResolvedValue(null);

      await expect(service.getDecryptedResponse('nonexistent')).rejects.toThrow(
        'Audit entry not found'
      );
    });

    it('should track decryption attempts', async () => {
      auditRepo.findOne!.mockResolvedValue(mockAudit);

      try {
        await service.getDecryptedResponse('audit1', 'u1');
      } catch (error) {
        console.log(error);
        // Expected to fail due to invalid encryption
      }

      const decryptionAttempts = (service as any).decryptionAttempts;
      expect(decryptionAttempts.size).toBeGreaterThan(0);
    });

    it('should reject after too many failed attempts', async () => {
      // Set up multiple failed attempts
      const key = 'audit1:u1';
      (service as any).decryptionAttempts.set(key, 6);

      await expect(
        service.getDecryptedResponse('audit1', 'u1')
      ).rejects.toThrow('Too many decryption attempts');
    });

    it('should validate decryption access', async () => {
      const originalData = { text: 'Sensitive data' };
      const encrypted = (service as any).encryptData(
        (service as any).prepareResponseData(originalData)
      );

      const auditWithOwner = {
        ...mockAudit,
        encryptedResponse: encrypted,
        user: { id: 'owner1' },
      } as AiAudit;

      auditRepo.findOne!.mockResolvedValue(auditWithOwner);

      // Request by different user
      await service.getDecryptedResponse('audit1', 'different-user');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized decryption attempt')
      );
    });
  });

  describe('bulkDecrypt', () => {
    it('should decrypt multiple audits', async () => {
      const originalData1 = { text: 'Response 1' };
      const originalData2 = { text: 'Response 2' };

      const encrypted1 = (service as any).encryptData(
        (service as any).prepareResponseData(originalData1)
      );
      const encrypted2 = (service as any).encryptData(
        (service as any).prepareResponseData(originalData2)
      );

      auditRepo
        .findOne!.mockResolvedValueOnce({
          ...mockAudit,
          id: 'a1',
          encryptedResponse: encrypted1,
        })
        .mockResolvedValueOnce({
          ...mockAudit,
          id: 'a2',
          encryptedResponse: encrypted2,
        });

      const results = await service.bulkDecrypt(['a1', 'a2'], 'u1');

      expect(results).toHaveLength(2);
      expect(results[0].decryptedResponse.data).toEqual(originalData1);
      expect(results[1].decryptedResponse.data).toEqual(originalData2);
    });

    it('should handle partial failures gracefully', async () => {
      auditRepo
        .findOne!.mockResolvedValueOnce(null) // First fails
        .mockResolvedValueOnce(mockAudit); // Second succeeds (but decryption fails)

      const results = await service.bulkDecrypt(['a1', 'a2'], 'u1');

      // Should not throw, just return successful ones
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should process in batches', async () => {
      const auditIds = Array.from({ length: 25 }, (_, i) => `audit${i}`);

      auditRepo.findOne!.mockResolvedValue(mockAudit);

      await service.bulkDecrypt(auditIds, 'u1');

      // Should process in batches of 10
      expect(auditRepo.findOne).toHaveBeenCalledTimes(25);
    });
  });

  describe('findByFilter', () => {
    it('should find audits by filter', async () => {
      const filter = {
        storeId: 's1',
        feature: 'description_generator',
      };

      const audits = [mockAudit];
      auditRepo.findByFilter!.mockResolvedValue(audits);

      const result = await service.findByFilter(filter, {}, 'u1');

      expect(result).toEqual(audits);
      expect(auditRepo.findByFilter).toHaveBeenCalledWith(filter, {});
    });

    it('should warn on unauthorized query attempts', async () => {
      const filter = { userId: 'other-user' };

      auditRepo.findByFilter!.mockResolvedValue([]);

      await service.findByFilter(filter, {}, 'requesting-user');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Potentially unauthorized query')
      );
    });
  });

  describe('getAuditStats', () => {
    it('should get audit statistics', async () => {
      const stats = {
        totalAudits: 100,
        byFeature: { description_generator: 50, title_generator: 50 },
        byProvider: { openai: 80, anthropic: 20 },
        byUser: { u1: 60, u2: 40 },
        byStore: { s1: 100 },
        dailyBreakdown: [],
        averageResponseSize: 500,
        encryptionHealth: {
          totalEncrypted: 100,
          corruptedEntries: 0,
          healthPercentage: 100,
        },
      };

      auditRepo.getAuditStats!.mockResolvedValue(stats);

      const result = await service.getAuditStats({ storeId: 's1' }, 'u1');

      expect(result).toEqual(stats);
    });
  });

  describe('getSuspiciousActivity', () => {
    it('should get suspicious activity report', async () => {
      const suspiciousAudits = [mockAudit];
      auditRepo.getSuspiciousAudits!.mockResolvedValue(suspiciousAudits);

      // Add some test data to security metrics
      (service as any).decryptionAttempts.set('audit1:u1', 3);
      (service as any).suspiciousPatterns.set('pattern1', 5);

      const result = await service.getSuspiciousActivity({
        unusualVolume: true,
      });

      expect(result.suspiciousAudits).toEqual(suspiciousAudits);
      expect(result.securityMetrics.totalDecryptionAttempts).toBeGreaterThan(0);
      expect(result.securityMetrics.unusualPatterns).toBeDefined();
    });
  });

  describe('validateIntegrity', () => {
    it('should validate encryption integrity', async () => {
      const integrityResults = {
        totalChecked: 100,
        validEntries: 98,
        corruptedEntries: 2,
        healthPercentage: 98,
      };

      auditRepo.validateEncryptionIntegrity!.mockResolvedValue(
        integrityResults
      );

      const result = await service.validateIntegrity(100);

      expect(result.overallHealth).toBe(98);
      expect(result.detailedResults).toEqual(integrityResults);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for low health', async () => {
      const integrityResults = {
        totalChecked: 100,
        validEntries: 90,
        corruptedEntries: 10,
        healthPercentage: 90,
      };

      auditRepo.validateEncryptionIntegrity!.mockResolvedValue(
        integrityResults
      );

      const result = await service.validateIntegrity();

      expectArrayToContainString(result.recommendations, 'integrity below 95%');
      expectArrayToContainString(
        result.recommendations,
        'corrupted encryption entries'
      );
    });

    it('should provide positive recommendation for perfect health', async () => {
      const integrityResults = {
        totalChecked: 100,
        validEntries: 100,
        corruptedEntries: 0,
        healthPercentage: 100,
      };

      auditRepo.validateEncryptionIntegrity!.mockResolvedValue(
        integrityResults
      );

      const result = await service.validateIntegrity();

      expectArrayToContainString(
        result.recommendations,
        'Encryption integrity is excellent'
      );
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report', async () => {
      const stats = {
        totalAudits: 100,
        byFeature: {},
        byProvider: {},
        byUser: {},
        byStore: {},
        dailyBreakdown: [],
        averageResponseSize: 500,
        encryptionHealth: {
          totalEncrypted: 100,
          corruptedEntries: 0,
          healthPercentage: 100,
        },
      };

      const integrityResults = {
        totalChecked: 50,
        validEntries: 50,
        corruptedEntries: 0,
        healthPercentage: 100,
      };

      auditRepo.getAuditStats!.mockResolvedValue(stats);
      auditRepo.validateEncryptionIntegrity!.mockResolvedValue(
        integrityResults
      );

      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      const report = await service.generateComplianceReport(dateFrom, dateTo);

      expect(report.reportId).toBeDefined();
      expect(report.period.from).toEqual(dateFrom);
      expect(report.period.to).toEqual(dateTo);
      expect(report.summary.totalAudits).toBe(100);
      expect(report.compliance).toBeDefined();
    });

    it('should include decrypted samples when requested', async () => {
      const stats = {
        totalAudits: 100,
        byFeature: {},
        byProvider: {},
        byUser: {},
        byStore: {},
        dailyBreakdown: [],
        averageResponseSize: 500,
        encryptionHealth: {
          totalEncrypted: 100,
          corruptedEntries: 0,
          healthPercentage: 100,
        },
      };

      const integrityResults = {
        totalChecked: 50,
        validEntries: 50,
        corruptedEntries: 0,
        healthPercentage: 100,
      };

      auditRepo.getAuditStats!.mockResolvedValue(stats);
      auditRepo.validateEncryptionIntegrity!.mockResolvedValue(
        integrityResults
      );
      auditRepo.getRecentAudits!.mockResolvedValue([mockAudit]);
      auditRepo.findOne!.mockResolvedValue(mockAudit);

      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      const report = await service.generateComplianceReport(dateFrom, dateTo, {
        includeDecryptedSamples: true,
      });

      expect(report.samples).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should cleanup old audits', async () => {
      const cleanupResult = {
        deletedCount: 500,
        preservedCount: 1000,
      };

      auditRepo.cleanupOldAudits!.mockResolvedValue(cleanupResult);

      const result = await service.cleanup(90, { preserveCount: 1000 });

      expect(result.deletedCount).toBe(500);
      expect(result.preservedCount).toBe(1000);
      expect(result.complianceWarnings).toBeDefined();
      expect(auditRepo.cleanupOldAudits).toHaveBeenCalledWith(90, 1000);
    });

    it('should perform dry run without deleting', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(500),
      };

      auditRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanup(30, { dryRun: true });

      expect(result.deletedCount).toBe(500);
      expect(auditRepo.cleanupOldAudits).not.toHaveBeenCalled();
    });

    it('should provide compliance warnings', async () => {
      auditRepo.cleanupOldAudits!.mockResolvedValue({
        deletedCount: 0,
        preservedCount: 50,
      });

      const result = await service.cleanup(15, {
        preserveCount: 50,
        complianceMode: true,
      });

      expectArrayToContainString(
        result.complianceWarnings,
        'Retention period less than 30 days'
      );
      expectArrayToContainString(
        result.complianceWarnings,
        'Preserving fewer than 100 entries'
      );
    });

    it('should use default values', async () => {
      auditRepo.cleanupOldAudits!.mockResolvedValue({
        deletedCount: 100,
        preservedCount: 1000,
      });

      await service.cleanup();

      expect(auditRepo.cleanupOldAudits).toHaveBeenCalledWith(90, 1000);
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = {
        text: 'Test response',
        metadata: { timestamp: '2025-01-01', score: 0.95 },
      };

      const prepared = (service as any).prepareResponseData(originalData);
      const encrypted = (service as any).encryptData(prepared);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.keyVersion).toBe('1.0');

      const decrypted = (service as any).decryptData(encrypted);

      expect(decrypted.data).toEqual(originalData);
      expect(decrypted.metadata.encryptedAt).toBeDefined();
    });

    it('should include checksum in prepared data', () => {
      const data = { test: 'value' };
      const prepared = (service as any).prepareResponseData(data);

      expect(prepared.metadata.checksum).toBeDefined();
      expect(prepared.metadata.checksum).toHaveLength(64); // SHA-256 hex
    });

    it('should throw error on decryption failure', () => {
      const invalidEncrypted = {
        ciphertext: 'invalid',
        iv: 'invalid',
        tag: 'invalid',
        keyVersion: '1.0',
      };

      expect(() => (service as any).decryptData(invalidEncrypted)).toThrow(
        'Failed to decrypt audit data'
      );
    });
  });

  describe('compliance checks', () => {
    it('should check data retention compliance', () => {
      const stats = { totalAudits: 100 } as any;
      const result = (service as any).checkDataRetentionCompliance(stats);

      expect(result.status).toBe('compliant');
      expect(result.details).toBeDefined();
    });

    it('should check encryption compliance', () => {
      const integrityCheck = { overallHealth: 98 };
      const result = (service as any).checkEncryptionCompliance(integrityCheck);

      expect(result.status).toBe('compliant');
    });

    it('should warn on low encryption health', () => {
      const integrityCheck = { overallHealth: 90 };
      const result = (service as any).checkEncryptionCompliance(integrityCheck);

      expect(result.status).toBe('warning');
    });

    it('should check access compliance', () => {
      const stats = { totalAudits: 100 } as any;
      const result = (service as any).checkAccessCompliance(stats);

      expect(result.status).toBe('compliant');
      expect(result.details).toBeDefined();
    });
  });
});
