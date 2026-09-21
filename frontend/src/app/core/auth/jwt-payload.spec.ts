import { describe, expect, it } from 'vitest';

import { readUserIdFromJwt } from './jwt-payload';

describe('readUserIdFromJwt', () => {
  it('reads userId from a JWT payload segment', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'tecnico@demo.com', userId: 2, role: 'TECHNICIAN' }));
    const token = `${header}.${payload}.sig`;
    expect(readUserIdFromJwt(token)).toBe(2);
  });
});
