import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

/**
 * Transform JSON string to object/array before validation
 */
export function ParseJson() {
  return Transform(({ value, key }) => {
    // Already parsed
    if (typeof value === 'object') {
      return value;
    }

    // Parse string
    if (typeof value === 'string') {
      // Empty string
      if (value === '' || value === '[]' || value === '{}') {
        return undefined;
      }

      // Try JSON parse
      if (value.startsWith('[') || value.startsWith('{')) {
        try {
          return JSON.parse(value);
        } catch (error) {
          throw new BadRequestException(
            `Invalid JSON in field '${key}': ${error.message}`
          );
        }
      }
    }

    return value;
  });
}

/**
 * Transform comma-separated string or JSON array to array
 */
export function ParseArray() {
  return Transform(({ value, key }) => {
    // Already an array
    if (Array.isArray(value)) {
      return value;
    }

    // Parse string
    if (typeof value === 'string') {
      // Empty
      if (value === '' || value === '[]') {
        return undefined;
      }

      // Comma-separated
      if (value.includes(',') && !value.startsWith('[')) {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }

      // JSON array
      if (value.startsWith('[')) {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new BadRequestException(`Field '${key}' must be an array`);
          }
          return parsed;
        } catch (error) {
          throw new BadRequestException(
            `Invalid JSON array in field '${key}': ${error.message}`
          );
        }
      }
    }

    return value;
  });
}
