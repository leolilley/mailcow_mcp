import { sanitizeInput, generateSecureToken, encryptAPIKey, decryptAPIKey, validateInput, auditLog, rateLimitCheck } from '../../../src/auth/security';

describe('Security Utilities', () => {
  describe('Input Sanitization', () => {
    it('should sanitize input by removing dangerous characters', () => {
      expect(sanitizeInput('<script>')).toBe('script');
      expect(sanitizeInput('hello"world')).toBe('helloworld');
      expect(sanitizeInput("test'value")).toBe('testvalue');
      expect(sanitizeInput('normal-text_123')).toBe('normal-text_123');
    });

    it('should validate input with regex patterns', () => {
      expect(validateInput('abc123', /^[a-z0-9]+$/)).toBe(true);
      expect(validateInput('abc-123', /^[a-z0-9]+$/)).toBe(false);
      expect(validateInput('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).toBe(true);
      expect(validateInput('invalid-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate a secure token with default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate a secure token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      expect(token1).not.toBe(token2);
    });
  });

  describe('API Key Encryption', () => {
    it('should encrypt API key consistently', () => {
      const key = 'test-api-key';
      const encrypted1 = encryptAPIKey(key);
      const encrypted2 = encryptAPIKey(key);
      
      expect(encrypted1).toHaveLength(64); // SHA-256 hash length
      expect(encrypted1).toBe(encrypted2); // Same input should produce same hash
      expect(encrypted1).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce different hashes for different keys', () => {
      const key1 = 'test-api-key-1';
      const key2 = 'test-api-key-2';
      const encrypted1 = encryptAPIKey(key1);
      const encrypted2 = encryptAPIKey(key2);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should decrypt API key hash', () => {
      const hash = 'abc123def456';
      const result = decryptAPIKey(hash);
      // Since this is currently a stub that returns empty string
      expect(result).toBe('');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auditLog('test_event', { userId: '123', action: 'login' });
      
      expect(consoleSpy).toHaveBeenCalledWith('Audit log:', 'test_event', { userId: '123', action: 'login' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('should perform rate limit check', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = rateLimitCheck('user-123');
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Rate limit check for:', 'user-123');
      
      consoleSpy.mockRestore();
    });
  });
}); 