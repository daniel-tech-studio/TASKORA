import { redact } from './app-logger';

describe('redact', () => {
  it('masque les clés sensibles à toute profondeur', () => {
    const out = redact({
      password: 'p', currentPassword: 'c', refreshToken: 'r', cookie: 'k', authorization: 'a', csrfToken: 't',
      nested: { passwordHash: 'h', ok: 'visible' }, list: [{ token: 'x' }],
    }) as Record<string, unknown>;
    expect(JSON.stringify(out)).not.toMatch(/"(p|c|r|k|a|t|h|x)"/);
    expect((out.nested as Record<string, unknown>).ok).toBe('visible');
  });
});
