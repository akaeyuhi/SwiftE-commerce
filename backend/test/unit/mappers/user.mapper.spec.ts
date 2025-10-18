// test/unit/user/user.mapper.spec.ts
import { UserMapper } from 'src/modules/user/user.mapper';
import { User } from 'src/entities/user/user.entity';
import { UserDto } from 'src/modules/user/dto/user.dto';

describe('UserMapper', () => {
  let mapper: UserMapper;

  beforeEach(() => {
    mapper = new UserMapper();
  });

  const createMockUser = (overrides?: Partial<User>): User =>
    ({
      id: 'u1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      ...overrides,
    }) as User;

  describe('toDto', () => {
    it('should map entity to DTO', () => {
      const user = createMockUser();

      const result = mapper.toDto(user);

      expect(result).toEqual({
        id: 'u1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('should handle missing firstName and lastName', () => {
      const user = createMockUser({
        firstName: null as any,
        lastName: null as any,
      });

      const result = mapper.toDto(user);

      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
    });
  });

  describe('toEntity', () => {
    it('should map DTO to entity', () => {
      const dto: Partial<UserDto> = {
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = mapper.toEntity(dto);

      expect(result.email).toBe('new@example.com');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should preserve id if provided', () => {
      const dto: Partial<UserDto> = {
        id: 'existing-id',
        email: 'test@example.com',
      };

      const result = mapper.toEntity(dto);

      expect(result.id).toBe('existing-id');
    });

    it('should preserve existing values when fields are undefined', () => {
      const dto: Partial<UserDto> = {
        email: 'new@example.com',
      };

      const result = mapper.toEntity(dto);

      expect(result.email).toBe('new@example.com');
      // firstName and lastName should remain as they were (undefined in new User())
    });

    it('should handle empty DTO', () => {
      const dto: Partial<UserDto> = {};

      const result = mapper.toEntity(dto);

      expect(result).toBeInstanceOf(User);
    });
  });
});
