import { DataSource, EntityManager, LessThan } from 'typeorm';
import { ConfirmationRepository } from 'src/modules/auth/confirmation/confirmation.repository';
import { Confirmation } from 'src/entities/user/authentication/confirmation.entity';
import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from 'test/utils/helpers';
import { User } from 'src/entities/user/user.entity';
import { Test, TestingModule } from '@nestjs/testing';

describe('ConfirmationRepository', () => {
  let repo: ConfirmationRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;

  const mockConfirmation: Confirmation = {
    id: 'c1',
    userId: 'u1',
    email: 'user@example.com',
    token: 'hashedToken',
    type: ConfirmationType.ACCOUNT_VERIFICATION,
    expiresAt: new Date(),
    isUsed: false,
    usedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as User,
  } as Confirmation;

  beforeEach(async () => {
    manager = createMockEntityManager(
      'findOne',
      'find',
      'update',
      'delete',
      'count'
    );
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmationRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repo = module.get<ConfirmationRepository>(ConfirmationRepository);

    // Mock the inherited Repository methods
    jest.spyOn(repo, 'find').mockImplementation(jest.fn());
    jest.spyOn(repo, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repo, 'findOneBy').mockImplementation(jest.fn());
    jest.spyOn(repo, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repo, 'create').mockImplementation(jest.fn());
    jest.spyOn(repo, 'save').mockImplementation(jest.fn());
    jest.spyOn(repo, 'update').mockImplementation(jest.fn());
    jest.spyOn(repo, 'count').mockImplementation(jest.fn());

    jest.clearAllMocks();
  });

  describe('findByToken', () => {
    it('should find confirmation by hashed token', async () => {
      (repo.findOne as jest.Mock)!.mockResolvedValue(mockConfirmation);

      const result = await repo.findByToken('hashedToken');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { token: 'hashedToken' },
        relations: ['user'],
      });
      expect(result).toEqual(mockConfirmation);
    });

    it('should return null when token not found', async () => {
      (repo.findOne as jest.Mock)!.mockResolvedValue(null);

      const result = await repo.findByToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findPendingByUserAndType', () => {
    it('should find pending confirmation by user and type', async () => {
      (repo.findOne as jest.Mock)!.mockResolvedValue(mockConfirmation);

      const result = await repo.findPendingByUserAndType(
        'u1',
        ConfirmationType.ACCOUNT_VERIFICATION
      );

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          type: ConfirmationType.ACCOUNT_VERIFICATION,
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockConfirmation);
    });
  });

  describe('findPendingByUser', () => {
    it('should find all pending confirmations by user', async () => {
      const confirmations = [mockConfirmation];
      (repo.find as jest.Mock)!.mockResolvedValue(confirmations);

      const result = await repo.findPendingByUser('u1');

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          isUsed: false,
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(confirmations);
    });
  });

  describe('markAsUsed', () => {
    it('should mark confirmation as used', async () => {
      (repo.update as jest.Mock)!.mockResolvedValue({ affected: 1 } as any);

      await repo.markAsUsed('c1');

      expect(repo.update).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          isUsed: true,
          usedAt: expect.any(Date),
        })
      );
    });
  });

  describe('invalidateByUserAndType', () => {
    it('should invalidate confirmations by user and type', async () => {
      (repo.update as jest.Mock)!.mockResolvedValue({ affected: 2 } as any);

      await repo.invalidateByUserAndType(
        'u1',
        ConfirmationType.ACCOUNT_VERIFICATION
      );

      expect(repo.update).toHaveBeenCalledWith(
        {
          userId: 'u1',
          type: ConfirmationType.ACCOUNT_VERIFICATION,
          isUsed: false,
        },
        expect.objectContaining({
          isUsed: true,
          usedAt: expect.any(Date),
        })
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      (repo.delete as jest.Mock)!.mockResolvedValue({ affected: 5 } as any);

      const result = await repo.cleanupExpiredTokens();

      expect(repo.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(expect.any(Date)),
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no tokens deleted', async () => {
      (repo.delete as jest.Mock)!.mockResolvedValue({ affected: 0 } as any);

      const result = await repo.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredTokensByType', () => {
    it('should delete expired tokens of specific type', async () => {
      (repo.delete as jest.Mock)!.mockResolvedValue({ affected: 3 } as any);

      const result = await repo.cleanupExpiredTokensByType(
        ConfirmationType.ACCOUNT_VERIFICATION
      );

      expect(repo.delete).toHaveBeenCalledWith({
        type: ConfirmationType.ACCOUNT_VERIFICATION,
        expiresAt: LessThan(expect.any(Date)),
      });
      expect(result).toBe(3);
    });
  });

  describe('cleanupOldUsedTokens', () => {
    it('should delete used tokens older than specified days', async () => {
      (repo.delete as jest.Mock)!.mockResolvedValue({ affected: 10 } as any);

      const result = await repo.cleanupOldUsedTokens(30);

      expect(repo.delete).toHaveBeenCalledWith({
        isUsed: true,
        usedAt: LessThan(expect.any(Date)),
      });
      expect(result).toBe(10);
    });

    it('should use default 30 days when not specified', async () => {
      (repo.delete as jest.Mock)!.mockResolvedValue({ affected: 5 } as any);

      await repo.cleanupOldUsedTokens();

      expect(repo.delete).toHaveBeenCalled();
    });
  });

  describe('getExpiredTokensCount', () => {
    it('should return count of expired tokens', async () => {
      (repo.count as jest.Mock)!.mockResolvedValue(15);

      const result = await repo.getExpiredTokensCount();

      expect(repo.count).toHaveBeenCalledWith({
        where: {
          expiresAt: LessThan(expect.any(Date)),
        },
      });
      expect(result).toBe(15);
    });
  });

  describe('getTokensExpiringSoon', () => {
    it('should return tokens expiring within specified hours', async () => {
      const confirmations = [mockConfirmation];
      (repo.find as jest.Mock)!.mockResolvedValue(confirmations);

      const result = await repo.getTokensExpiringSoon(24);

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          expiresAt: LessThan(expect.any(Date)),
          isUsed: false,
        },
        relations: ['user'],
        order: { expiresAt: 'ASC' },
      });
      expect(result).toEqual(confirmations);
    });
  });

  describe('performMaintenance', () => {
    it('should perform full maintenance cleanup', async () => {
      (repo.delete as jest.Mock)!.mockResolvedValueOnce({ affected: 5 } as any);
      (repo.delete as jest.Mock)!.mockResolvedValueOnce({ affected: 3 } as any);

      const result = await repo.performMaintenance();

      expect(result).toEqual({
        expiredTokensDeleted: 5,
        oldUsedTokensDeleted: 3,
        totalCleaned: 8,
      });
    });
  });

  describe('findByEmail', () => {
    it('should find confirmations by email', async () => {
      const confirmations = [mockConfirmation];
      (repo.find as jest.Mock)!.mockResolvedValue(confirmations);

      const result = await repo.findByEmail('user@example.com');

      expect(repo.find).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(confirmations);
    });
  });

  describe('getConfirmationStats', () => {
    it('should return confirmation statistics', async () => {
      (repo.count as jest.Mock)!
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(75) // used
        .mockResolvedValueOnce(5) // expired
        .mockResolvedValueOnce(60) // ACCOUNT_VERIFICATION
        .mockResolvedValueOnce(20) // SITE_ADMIN_ROLE
        .mockResolvedValueOnce(10) // STORE_ADMIN_ROLE
        .mockResolvedValueOnce(5) // STORE_MODERATOR_ROLE
        .mockResolvedValueOnce(5); // PASSWORD_RESET

      const result = await repo.getConfirmationStats();

      expect(result.total).toBe(100);
      expect(result.pending).toBe(20);
      expect(result.used).toBe(75);
      expect(result.expired).toBe(5);
      expect(result.byType[ConfirmationType.ACCOUNT_VERIFICATION]).toBe(60);
    });
  });
});
