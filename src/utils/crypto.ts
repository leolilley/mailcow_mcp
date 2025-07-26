import * as crypto from 'crypto';

export async function hash(data: string, algorithm: string = 'sha256'): Promise<string> {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const buf = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[buf[i] % chars.length];
  }
  return result;
}

export async function passwordHash(password: string): Promise<string> {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function validateCertificate(cert: string): boolean {
  // Simple PEM format check
  return cert.startsWith('-----BEGIN CERTIFICATE-----') && cert.endsWith('-----END CERTIFICATE-----');
} 