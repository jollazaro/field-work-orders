/** Reads claims from a JWT payload (no signature verification — API already issued it). */
export function readUserIdFromJwt(token: string): number {
  const payload = decodeJwtPayload(token);
  const raw = payload['userId'];
  const id = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('JWT missing userId claim');
  }
  return id;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Malformed JWT');
  }
  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}
