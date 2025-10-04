import { CaseTransformer } from 'src/common/utils/case-transformer.util';
/* eslint-disable camelcase */

describe('CaseTransformer', () => {
  describe('snakeToCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect(CaseTransformer.snakeToCamel('hello_world')).toBe('helloWorld');
      expect(CaseTransformer.snakeToCamel('user_id')).toBe('userId');
      expect(CaseTransformer.snakeToCamel('created_at')).toBe('createdAt');
    });

    it('should handle single words', () => {
      expect(CaseTransformer.snakeToCamel('hello')).toBe('hello');
    });

    it('should handle multiple underscores', () => {
      expect(CaseTransformer.snakeToCamel('very_long_variable_name')).toBe(
        'veryLongVariableName'
      );
    });
  });

  describe('camelToSnake', () => {
    it('should convert camelCase to snake_case', () => {
      expect(CaseTransformer.camelToSnake('helloWorld')).toBe('hello_world');
      expect(CaseTransformer.camelToSnake('userId')).toBe('user_id');
      expect(CaseTransformer.camelToSnake('createdAt')).toBe('created_at');
    });

    it('should handle single words', () => {
      expect(CaseTransformer.camelToSnake('hello')).toBe('hello');
    });

    it('should handle multiple capitals', () => {
      expect(CaseTransformer.camelToSnake('veryLongVariableName')).toBe(
        'very_long_variable_name'
      );
    });
  });

  describe('transformKeysToCamel', () => {
    it('should transform simple object keys', () => {
      const input = {
        user_id: '123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const expected = {
        userId: '123',
        firstName: 'John',
        lastName: 'Doe',
      };

      expect(CaseTransformer.transformKeysToCamel(input)).toEqual(expected);
    });

    it('should transform nested objects', () => {
      const input = {
        user_data: {
          user_id: '123',
          profile_info: {
            first_name: 'John',
            created_at: '2024-01-01',
          },
        },
      };

      const expected = {
        userData: {
          userId: '123',
          profileInfo: {
            firstName: 'John',
            createdAt: '2024-01-01',
          },
        },
      };

      expect(CaseTransformer.transformKeysToCamel(input)).toEqual(expected);
    });

    it('should transform arrays of objects', () => {
      const input = {
        user_list: [
          { user_id: '1', first_name: 'John' },
          { user_id: '2', first_name: 'Jane' },
        ],
      };

      const expected = {
        userList: [
          { userId: '1', firstName: 'John' },
          { userId: '2', firstName: 'Jane' },
        ],
      };

      expect(CaseTransformer.transformKeysToCamel(input)).toEqual(expected);
    });

    it('should handle null and undefined', () => {
      expect(CaseTransformer.transformKeysToCamel(null)).toBeNull();
      expect(CaseTransformer.transformKeysToCamel(undefined)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(CaseTransformer.transformKeysToCamel('string')).toBe('string');
      expect(CaseTransformer.transformKeysToCamel(123)).toBe(123);
      expect(CaseTransformer.transformKeysToCamel(true)).toBe(true);
    });
  });

  describe('transformKeysToSnake', () => {
    it('should transform simple object keys', () => {
      const input = {
        userId: '123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expected = {
        user_id: '123',
        first_name: 'John',
        last_name: 'Doe',
      };

      expect(CaseTransformer.transformKeysToSnake(input)).toEqual(expected);
    });

    it('should transform nested objects', () => {
      const input = {
        userData: {
          userId: '123',
          profileInfo: {
            firstName: 'John',
            createdAt: '2024-01-01',
          },
        },
      };

      const expected = {
        user_data: {
          user_id: '123',
          profile_info: {
            first_name: 'John',
            created_at: '2024-01-01',
          },
        },
      };

      expect(CaseTransformer.transformKeysToSnake(input)).toEqual(expected);
    });

    it('should transform arrays of objects', () => {
      const input = {
        userList: [
          { userId: '1', firstName: 'John' },
          { userId: '2', firstName: 'Jane' },
        ],
      };

      const expected = {
        user_list: [
          { user_id: '1', first_name: 'John' },
          { user_id: '2', first_name: 'Jane' },
        ],
      };

      expect(CaseTransformer.transformKeysToSnake(input)).toEqual(expected);
    });
  });

  describe('transformKeysToCamelWithExclusions', () => {
    it('should exclude specified keys from transformation', () => {
      const input = {
        user_id: '123',
        created_at: '2024-01-01',
        metadata: {
          custom_field: 'value',
        },
      };

      const expected = {
        userId: '123',
        created_at: '2024-01-01', // Excluded
        metadata: {
          custom_field: 'value', // Excluded
        },
      };

      expect(
        CaseTransformer.transformKeysToCamelWithExclusions(input, [
          'created_at',
          'custom_field',
        ])
      ).toEqual(expected);
    });
  });

  describe('transformKeysToSnakeWithExclusions', () => {
    it('should exclude specified keys from transformation', () => {
      const input = {
        userId: '123',
        createdAt: '2024-01-01',
        metadata: {
          customField: 'value',
        },
      };

      const expected = {
        user_id: '123',
        createdAt: '2024-01-01', // Excluded
        metadata: {
          customField: 'value', // Excluded
        },
      };

      expect(
        CaseTransformer.transformKeysToSnakeWithExclusions(input, [
          'createdAt',
          'customField',
        ])
      ).toEqual(expected);
    });
  });
});
