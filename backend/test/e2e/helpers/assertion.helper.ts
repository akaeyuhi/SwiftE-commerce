import { expect } from '@jest/globals';

export class AssertionHelper {
  /**
   * Assert response has pagination metadata
   */
  static assertPagination(
    response: any,
    expectedKeys: string[] = ['page', 'limit', 'total']
  ) {
    for (const key of expectedKeys) {
      expect(response.body).toHaveProperty(key);
      expect(typeof response.body[key]).toBe('number');
    }
  }

  /**
   * Assert response is a valid DTO
   */
  static assertDto(response: any, requiredFields: string[]) {
    for (const field of requiredFields) {
      expect(response.body).toHaveProperty(field);
    }
  }

  /**
   * Assert timestamp fields are valid
   */
  static assertTimestamps(entity: any) {
    expect(entity).toHaveProperty('createdAt');
    expect(entity).toHaveProperty('updatedAt');
    expect(new Date(entity.createdAt)).toBeInstanceOf(Date);
    expect(new Date(entity.updatedAt)).toBeInstanceOf(Date);
  }

  /**
   * Assert UUID format
   */
  static assertUUID(value: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(value).toMatch(uuidRegex);
  }

  /**
   * Assert array of DTOs
   */
  static assertDtoArray(response: any, minLength: number = 1) {
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(minLength);
  }

  /**
   * Assert error response structure
   */
  static assertErrorResponse(
    response: any,
    expectedStatus: number,
    expectedMessage?: string
  ) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('statusCode', expectedStatus);
    expect(response.body).toHaveProperty('message');

    if (expectedMessage) {
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message.toLowerCase()).toContain(expectedMessage.toLowerCase());
    }
  }

  /**
   * Assert stats DTO has required metrics
   */
  static assertStatsDto(stats: any) {
    const requiredFields = [
      'viewCount',
      'likeCount',
      'totalSales',
      'reviewCount',
    ];
    for (const field of requiredFields) {
      expect(stats).toHaveProperty(field);
      expect(typeof stats[field]).toBe('number');
    }
  }

  /**
   * Assert response has specific cookie
   */
  static assertCookie(response: any, cookieName: string) {
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    expect(cookies.some((c) => c && c.includes(cookieName))).toBe(true);
  }

  /**
   * Extract cookie value from response
   */
  static getCookieValue(response: any, cookieName: string): string | undefined {
    const setCookie = response.headers['set-cookie'];
    if (!setCookie) return undefined;

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const cookie = cookies.find((c) => c && c.includes(cookieName));

    if (!cookie) return undefined;
    return cookie.split(';')[0].split('=')[1];
  }

  /**
   * Get all cookies as array from response
   */
  static getCookies(response: any): string[] {
    const setCookie = response.headers['set-cookie'];
    if (!setCookie) return [];
    return Array.isArray(setCookie) ? setCookie : [setCookie];
  }
}
