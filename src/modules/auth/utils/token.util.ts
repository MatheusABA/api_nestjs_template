import * as crypto from 'crypto';

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashToken(token: string, pepper: string): string {
  return crypto
    .createHash('sha256')
    .update(token + pepper)
    .digest('hex');
}
