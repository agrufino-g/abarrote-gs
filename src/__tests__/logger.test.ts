import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRequestContext,
  getRequestContext,
  extractRequestId,
} from '@/lib/logger';

describe('Enterprise Logger', () => {
  describe('request context (correlation IDs)', () => {
    it('should get current request context', () => {
      withRequestContext({ requestId: 'req-xyz' }, () => {
        const ctx = getRequestContext();
        expect(ctx?.requestId).toBe('req-xyz');
      });
    });

    it('should return undefined outside of context', () => {
      const ctx = getRequestContext();
      expect(ctx).toBeUndefined();
    });

    it('should generate requestId if not provided', () => {
      withRequestContext({}, () => {
        const ctx = getRequestContext();
        expect(ctx?.requestId).toBeDefined();
        expect(ctx?.requestId).toMatch(/^req-/);
      });
    });

    it('should propagate traceId and spanId', () => {
      withRequestContext({ 
        requestId: 'req-1',
        traceId: 'trace-abc',
        spanId: 'span-xyz',
      }, () => {
        const ctx = getRequestContext();
        expect(ctx?.requestId).toBe('req-1');
        expect(ctx?.traceId).toBe('trace-abc');
        expect(ctx?.spanId).toBe('span-xyz');
      });
    });

    it('should not leak context between calls', () => {
      let insideRequestId: string | undefined;
      
      withRequestContext({ requestId: 'req-first' }, () => {
        insideRequestId = getRequestContext()?.requestId;
      });

      const outsideRequestId = getRequestContext()?.requestId;

      expect(insideRequestId).toBe('req-first');
      expect(outsideRequestId).toBeUndefined();
    });

    it('should merge nested contexts', () => {
      withRequestContext({ requestId: 'req-outer', userId: 'user-1' }, () => {
        withRequestContext({ traceId: 'trace-inner' }, () => {
          const ctx = getRequestContext();
          expect(ctx?.requestId).toBe('req-outer');
          expect(ctx?.userId).toBe('user-1');
          expect(ctx?.traceId).toBe('trace-inner');
        });
      });
    });
  });

  describe('extractRequestId', () => {
    it('should extract x-request-id header', () => {
      const headers = new Headers({ 'x-request-id': 'req-from-header' });
      expect(extractRequestId(headers)).toBe('req-from-header');
    });

    it('should fallback to x-correlation-id', () => {
      const headers = new Headers({ 'x-correlation-id': 'corr-123' });
      expect(extractRequestId(headers)).toBe('corr-123');
    });

    it('should fallback to x-trace-id', () => {
      const headers = new Headers({ 'x-trace-id': 'trace-456' });
      expect(extractRequestId(headers)).toBe('trace-456');
    });

    it('should generate ID if no headers present', () => {
      const headers = new Headers();
      const id = extractRequestId(headers);
      expect(id).toMatch(/^req-/);
    });

    it('should prefer x-request-id over others', () => {
      const headers = new Headers({
        'x-request-id': 'req-id',
        'x-correlation-id': 'corr-id',
        'x-trace-id': 'trace-id',
      });
      expect(extractRequestId(headers)).toBe('req-id');
    });
  });
});
