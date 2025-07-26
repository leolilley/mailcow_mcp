// import { SecurityUtils } from '../types';
import xss from 'xss';

export function sanitizeString(input: string): string {
  return xss(input, {
    whiteList: {}, // No tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  
  // Node.js crypto
  const crypto = require('crypto');
  const buf = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    randomValues[i] = buf[i];
  }
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function generateAPIKey(): string {
  return generateSecureToken(64);
} 