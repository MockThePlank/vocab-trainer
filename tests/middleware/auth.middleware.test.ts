/// <reference types="vitest" />
import { requireApiKey } from '../../src/middleware/auth.middleware';
import { describe, test, expect, vi } from 'vitest';

describe('auth.middleware requireApiKey', () => {
  test('rejects when API key missing or wrong', () => {
    process.env.ADMIN_API_KEY = 'secret-key';

    // Mock Request/Response
    const req: any = { header: () => 'bad' };
    const res: any = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();

    // Call middleware
    requireApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next on valid key', () => {
    process.env.ADMIN_API_KEY = 'secret-key';

    const req: any = { header: () => 'secret-key' };
    const res: any = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();

    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
