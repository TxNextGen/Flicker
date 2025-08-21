import { describe, it, expect } from 'vitest';
import { validatePassword, hashPassword, verifyPassword } from '../src/lib/auth';

describe('auth utilities', () => {
  it('validatePassword accepts valid passwords and rejects invalid ones', () => {
    expect(validatePassword('Short1!')).toBe(false); // too short
    expect(validatePassword('nouppercase1!')).toBe(false);
    expect(validatePassword('NOLOWERCASE1!')).toBe(false);
    expect(validatePassword('NoNumber!')).toBe(false);
    expect(validatePassword('NoSpecial1')).toBe(false);

    expect(validatePassword('GoodPass1!')).toBe(true);
    expect(validatePassword('Another$Pass2')).toBe(true);
  });

  it('hashPassword returns a salt$hash string and verifyPassword succeeds', () => {
    const pw = 'ValidPass1!';
    const stored = hashPassword(pw);
    expect(typeof stored).toBe('string');
    expect(stored.split('$').length).toBe(2);

    expect(verifyPassword(pw, stored)).toBe(true);
    expect(verifyPassword('WrongPass1!', stored)).toBe(false);
  });

  it('verifyPassword tolerates invalid stored formats', () => {
    expect(verifyPassword('anything', '')).toBe(false);
    expect(verifyPassword('anything', 'nodelimiter')).toBe(false);
    expect(verifyPassword('anything', 'too$many$parts')).toBe(false);
  });
});
