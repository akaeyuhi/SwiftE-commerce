/**
 * Case Transformation Utilities
 *
 * Utilities for converting between snake_case and camelCase
 * for API request/response transformations
 */

export class CaseTransformer {
  /**
   * Convert snake_case to camelCase
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert camelCase to snake_case
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Transform object keys from snake_case to camelCase
   */
  static transformKeysToCamel<T = any>(obj: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformKeysToCamel(item)) as any;
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const transformed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const camelKey = this.snakeToCamel(key);
        transformed[camelKey] = this.transformKeysToCamel(value);
      }

      return transformed;
    }

    return obj;
  }

  /**
   * Transform object keys from camelCase to snake_case
   */
  static transformKeysToSnake<T = any>(obj: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformKeysToSnake(item)) as any;
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const transformed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const snakeKey = this.camelToSnake(key);
        transformed[snakeKey] = this.transformKeysToSnake(value);
      }

      return transformed;
    }

    return obj;
  }

  /**
   * Transform with exclusions (keys to skip)
   */
  static transformKeysToCamelWithExclusions<T = any>(
    obj: any,
    exclusions: string[] = []
  ): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.transformKeysToCamelWithExclusions(item, exclusions)
      ) as any;
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const transformed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (exclusions.includes(key)) {
          transformed[key] = value;
        } else {
          const camelKey = this.snakeToCamel(key);
          transformed[camelKey] = this.transformKeysToCamelWithExclusions(
            value,
            exclusions
          );
        }
      }

      return transformed;
    }

    return obj;
  }

  /**
   * Transform with exclusions for snake_case
   */
  static transformKeysToSnakeWithExclusions<T = any>(
    obj: any,
    exclusions: string[] = []
  ): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.transformKeysToSnakeWithExclusions(item, exclusions)
      ) as any;
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const transformed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (exclusions.includes(key)) {
          transformed[key] = value;
        } else {
          const snakeKey = this.camelToSnake(key);
          transformed[snakeKey] = this.transformKeysToSnakeWithExclusions(
            value,
            exclusions
          );
        }
      }

      return transformed;
    }

    return obj;
  }
}
