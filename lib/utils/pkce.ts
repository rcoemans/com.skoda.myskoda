'use strict';

import crypto from 'crypto';

export function generateVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}
