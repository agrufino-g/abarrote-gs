import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  createIdCursor,
  createTimestampCursor,
  decodeTimestampCursor,
  parsePaginationParams,
  buildPaginationParams,
  formatPaginatedResponse,
  type PageInfo,
  type CursorData,
} from '@/lib/pagination';

describe('Cursor Pagination', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('should encode and decode simple data', () => {
      const data: CursorData = { id: 'product-123' };
      const cursor = encodeCursor(data);

      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual(data);
    });

    it('should handle complex data', () => {
      const data: CursorData = {
        id: 'p-456',
        createdAt: '2024-01-15T10:30:00Z',
        price: 99.99,
      };
      const cursor = encodeCursor(data);
      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(data);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const data: CursorData = { ts: date.toISOString() };
      const cursor = encodeCursor(data);
      const decoded = decodeCursor(cursor);

      expect(decoded?.ts).toBe(date.toISOString());
    });

    it('should handle null values', () => {
      const data: CursorData = { id: 'test', optional: null };
      const cursor = encodeCursor(data);
      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(data);
    });

    it('should produce URL-safe cursors', () => {
      const data: CursorData = { id: 'test/with+special=chars' };
      const cursor = encodeCursor(data);

      // Should not contain URL-unsafe characters
      expect(cursor).not.toContain('+');
      expect(cursor).not.toContain('/');
      expect(cursor).not.toContain('=');
    });

    it('should return null for invalid cursor', () => {
      expect(decodeCursor('invalid-cursor')).toBeNull();
      expect(decodeCursor('')).toBeNull();
      expect(decodeCursor('!!!')).toBeNull();
    });
  });

  describe('createIdCursor', () => {
    it('should create cursor from ID', () => {
      const cursor = createIdCursor('product-123');
      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual({ id: 'product-123' });
    });
  });

  describe('createTimestampCursor / decodeTimestampCursor', () => {
    it('should create timestamp cursor from Date', () => {
      const date = new Date('2024-03-20T15:00:00Z');
      const cursor = createTimestampCursor(date, 'p-789');
      const decoded = decodeTimestampCursor(cursor);

      expect(decoded).toEqual({
        ts: '2024-03-20T15:00:00.000Z',
        id: 'p-789',
      });
    });

    it('should create timestamp cursor from string', () => {
      const cursor = createTimestampCursor('2024-03-20T15:00:00Z', 'p-789');
      const decoded = decodeTimestampCursor(cursor);

      expect(decoded).toEqual({
        ts: '2024-03-20T15:00:00Z',
        id: 'p-789',
      });
    });

    it('should return null for invalid timestamp cursor', () => {
      const cursor = encodeCursor({ invalid: 'data' });
      expect(decodeTimestampCursor(cursor)).toBeNull();
    });
  });

  describe('parsePaginationParams', () => {
    it('should parse cursor from search params', () => {
      const params = new URLSearchParams('cursor=abc123');
      const result = parsePaginationParams(params);

      expect(result.cursor).toBe('abc123');
    });

    it('should parse limit from search params', () => {
      const params = new URLSearchParams('limit=50');
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(50);
    });

    it('should default limit to 20', () => {
      const params = new URLSearchParams();
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(20);
    });

    it('should parse direction from search params', () => {
      const params = new URLSearchParams('direction=backward');
      const result = parsePaginationParams(params);

      expect(result.direction).toBe('backward');
    });

    it('should default direction to forward', () => {
      const params = new URLSearchParams();
      const result = parsePaginationParams(params);

      expect(result.direction).toBe('forward');
    });

    it('should handle all params together', () => {
      const params = new URLSearchParams('cursor=xyz&limit=25&direction=backward');
      const result = parsePaginationParams(params);

      expect(result).toEqual({
        cursor: 'xyz',
        limit: 25,
        direction: 'backward',
      });
    });
  });

  describe('buildPaginationParams', () => {
    it('should build next page params', () => {
      const pageInfo: PageInfo = {
        startCursor: 'start-cursor',
        endCursor: 'end-cursor',
        hasPreviousPage: false,
        hasNextPage: true,
      };

      const params = buildPaginationParams(pageInfo, 'next');

      expect(params).toEqual({
        cursor: 'end-cursor',
        direction: 'forward',
      });
    });

    it('should build prev page params', () => {
      const pageInfo: PageInfo = {
        startCursor: 'start-cursor',
        endCursor: 'end-cursor',
        hasPreviousPage: true,
        hasNextPage: true,
      };

      const params = buildPaginationParams(pageInfo, 'prev');

      expect(params).toEqual({
        cursor: 'start-cursor',
        direction: 'backward',
      });
    });

    it('should return empty if no next page', () => {
      const pageInfo: PageInfo = {
        startCursor: 'start',
        endCursor: 'end',
        hasPreviousPage: true,
        hasNextPage: false,
      };

      const params = buildPaginationParams(pageInfo, 'next');

      expect(params).toEqual({});
    });

    it('should return empty if no prev page', () => {
      const pageInfo: PageInfo = {
        startCursor: 'start',
        endCursor: 'end',
        hasPreviousPage: false,
        hasNextPage: true,
      };

      const params = buildPaginationParams(pageInfo, 'prev');

      expect(params).toEqual({});
    });
  });

  describe('formatPaginatedResponse', () => {
    it('should format response correctly', () => {
      const result = {
        data: [{ id: '1' }, { id: '2' }],
        pageInfo: {
          startCursor: 'start',
          endCursor: 'end',
          hasPreviousPage: false,
          hasNextPage: true,
          totalCount: 100,
        },
      };

      const formatted = formatPaginatedResponse(result);

      expect(formatted).toEqual({
        data: [{ id: '1' }, { id: '2' }],
        pagination: {
          startCursor: 'start',
          endCursor: 'end',
          hasPreviousPage: false,
          hasNextPage: true,
          totalCount: 100,
        },
      });
    });

    it('should handle empty results', () => {
      const result = {
        data: [],
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };

      const formatted = formatPaginatedResponse(result);

      expect(formatted.data).toEqual([]);
      expect(formatted.pagination.startCursor).toBeNull();
      expect(formatted.pagination.endCursor).toBeNull();
    });
  });

  describe('cursor stability', () => {
    it('should produce consistent cursors for same data', () => {
      const data: CursorData = { id: 'test', ts: '2024-01-01' };

      const cursor1 = encodeCursor(data);
      const cursor2 = encodeCursor(data);

      expect(cursor1).toBe(cursor2);
    });

    it('should produce different cursors for different data', () => {
      const cursor1 = encodeCursor({ id: 'a' });
      const cursor2 = encodeCursor({ id: 'b' });

      expect(cursor1).not.toBe(cursor2);
    });
  });
});
