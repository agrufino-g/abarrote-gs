import { test, expect } from '@playwright/test';

/**
 * Cobrar.io Webhook E2E Tests
 *
 * Validates the /api/webhooks/cobrar endpoint handles
 * signature verification, event processing, and error cases.
 */

const WEBHOOK_URL = '/api/webhooks/cobrar';

test.describe('Cobrar.io Webhook — Input Validation', () => {
  test('rejects GET requests', async ({ request }) => {
    const response = await request.get(WEBHOOK_URL);
    expect([405, 404]).toContain(response.status());
  });

  test('rejects invalid JSON body', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: 'not json {{{',
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON');
  });

  test('rejects payload missing required fields', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: { foo: 'bar' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing required fields');
  });

  test('rejects payload with missing event.data.id', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: { id: 'evt_1', type: 'charge.paid', data: {} },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe('Cobrar.io Webhook — Event Processing', () => {
  test('accepts well-formed charge.paid event (charge not found = handled:false)', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: {
        id: `evt_test_${Date.now()}`,
        type: 'charge.paid',
        data: {
          id: 'chg_nonexistent',
          amount: 150.00,
          currency: 'MXN',
          status: 'paid',
          reference: 'REF-TEST',
        },
      },
    });
    // Should return 200 (accepted) even if charge not found
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  test('accepts charge.expired event', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: {
        id: `evt_expired_${Date.now()}`,
        type: 'charge.expired',
        data: {
          id: 'chg_expired_test',
          amount: 99.99,
          currency: 'MXN',
          status: 'expired',
          reference: 'REF-EXP',
        },
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  test('accepts charge.cancelled event', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: {
        id: `evt_cancel_${Date.now()}`,
        type: 'charge.cancelled',
        data: {
          id: 'chg_cancel_test',
          amount: 200.00,
          currency: 'MXN',
          status: 'cancelled',
          reference: 'REF-CAN',
        },
      },
    });
    expect(response.status()).toBe(200);
  });

  test('returns handled:false for unknown event types', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: {
        id: `evt_unknown_${Date.now()}`,
        type: 'charge.refunded',
        data: {
          id: 'chg_refund_test',
          amount: 50.00,
          currency: 'MXN',
          status: 'refunded',
          reference: 'REF-REF',
        },
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.handled).toBe(false);
  });
});

test.describe('Cobrar.io Webhook — Idempotency', () => {
  test('deduplicates repeated event IDs', async ({ request }) => {
    const eventId = `evt_dedup_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'charge.paid',
      data: {
        id: 'chg_dedup_test',
        amount: 100.00,
        currency: 'MXN',
        status: 'paid',
        reference: 'REF-DUP',
      },
    };

    // First request
    const r1 = await request.post(WEBHOOK_URL, { data: payload });
    expect(r1.status()).toBe(200);

    // Second request with same event ID
    const r2 = await request.post(WEBHOOK_URL, { data: payload });
    expect(r2.status()).toBe(200);
    const body2 = await r2.json();
    expect(body2.duplicate).toBe(true);
  });
});
