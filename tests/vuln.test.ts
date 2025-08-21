import { describe, it, expect, vi } from 'vitest';
import { marked } from 'marked';

// XSS unit test: demonstrate that raw markdown/html can produce unsafe HTML when not sanitized
describe('XSS and parsing checks', () => {
  it('marked produces unsafe HTML for attacker-supplied attributes (demonstrates XSS risk)', () => {
    const malicious = "<img src=x onerror=alert('xss') />";
    const out = marked(malicious);
    // marked will not remove the onerror attribute by default
    expect(out).toContain('onerror');
    expect(out).toContain('img');
  });
});

// CSRF-like protection tests for the chat management endpoint
describe('CSRF / Authorization checks for chat management', () => {
  it('returns 401 when Authorization header is missing', async () => {
    // Mock $lib and $lib/jwt used by the handler
    vi.mock('$lib', () => ({
      getDB: async (username: string) => null,
      setDB: async () => {},
    }));
    vi.mock('$lib/jwt', () => ({
      extractTokenFromHeader: (h: any) => null,
      verifyToken: (t: any) => null,
    }));

    // dynamic import after mocks are registered
  const mod = await import('../src/routes/api/chat/management/+server');

    // Create a minimal request-like object
    const fakeRequest = {
      json: async () => ({ action: 'create', chatName: 'test', messages: [] }),
      // Provide headers.get for compatibility
      headers: {
        get: (k: string) => null,
      },
    } as any;

    const res = await mod.POST({ request: fakeRequest } as any);
    // The handler uses json(...) from svelte kit which returns a Response-like object.
    // For the no-auth case it returns json({ error: ... }, { status: 401 })
    // This object has a `status` property when running in Node here, so assert it.
    expect(res.status).toBe(401);
  });
});
