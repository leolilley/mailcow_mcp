import crypto from 'crypto';

export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input.replace(/[<>"'`;(){}]/g, '');
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function encryptAPIKey(key: string): string {
  // Simple example: hash the key (replace with real encryption in production)
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function decryptAPIKey(hash: string): string {
  console.log('Decrypting API key hash:', hash);
  // TODO: Implement real decryption if using encryption (not hash)
  return '';
}

export function validateInput(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}

export function auditLog(event: string, details: Record<string, unknown>): void {
  console.log('Audit log:', event, details);
  // TODO: Implement audit logging (e.g., write to file, DB, or external service)
  // Example: console.log(`[AUDIT] ${event}`, details);
}

export function rateLimitCheck(identifier: string): boolean {
  console.log('Rate limit check for:', identifier);
  // TODO: Implement rate limiting logic (e.g., in-memory, Redis)
  return true;
} 