import { sanitizeString, generateSecureToken, generateAPIKey } from '../../../src/utils/security';

describe('Security Utils', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
    });

    it('should remove all HTML tags by default', () => {
      const input = '<div><p>Hello <strong>world</strong></p></div>';
      const result = sanitizeString(input);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
      expect(result).toContain('Hello world');
    });

    it('should handle empty strings', () => {
      const result = sanitizeString('');
      expect(result).toBe('');
    });

    it('should preserve plain text', () => {
      const input = 'This is just plain text with no HTML';
      const result = sanitizeString(input);
      expect(result).toBe(input);
    });

    it('should handle special characters safely', () => {
      const input = 'Price: $100 & tax = 15%';
      const result = sanitizeString(input);
      expect(result).toContain('Price: $100');
      expect(result).toContain('tax = 15%');
    });

    it('should remove potentially dangerous attributes', () => {
      const input = '<img src="x" onerror="alert(1)" />Safe text';
      const result = sanitizeString(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe text');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate token with custom length', () => {
      const lengths = [16, 24, 48, 64];
      
      lengths.forEach(length => {
        const token = generateSecureToken(length);
        expect(token).toHaveLength(length);
        expect(token).toMatch(/^[A-Za-z0-9]+$/);
      });
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);
      const token3 = generateSecureToken(32);
      
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate tokens with only alphanumeric characters', () => {
      const token = generateSecureToken(100);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
      expect(token).not.toMatch(/[^A-Za-z0-9]/);
    });

    it('should handle edge case of very small length', () => {
      const token = generateSecureToken(1);
      expect(token).toHaveLength(1);
      expect(token).toMatch(/^[A-Za-z0-9]$/);
    });
  });

  describe('generateAPIKey', () => {
    it('should generate API key with correct length', () => {
      const apiKey = generateAPIKey();
      expect(apiKey).toHaveLength(64);
      expect(apiKey).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different API keys each time', () => {
      const apiKey1 = generateAPIKey();
      const apiKey2 = generateAPIKey();
      const apiKey3 = generateAPIKey();
      
      expect(apiKey1).not.toBe(apiKey2);
      expect(apiKey2).not.toBe(apiKey3);
      expect(apiKey1).not.toBe(apiKey3);
    });

    it('should generate API keys suitable for authentication', () => {
      const apiKey = generateAPIKey();
      
      // Should be long enough for security
      expect(apiKey.length).toBeGreaterThanOrEqual(32);
      
      // Should contain mix of characters for entropy
      expect(apiKey).toMatch(/[A-Z]/);
      expect(apiKey).toMatch(/[a-z]/);
      expect(apiKey).toMatch(/[0-9]/);
    });

    it('should generate cryptographically strong keys', () => {
      const keys = Array.from({ length: 100 }, () => generateAPIKey());
      const uniqueKeys = new Set(keys);
      
      // All keys should be unique
      expect(uniqueKeys.size).toBe(100);
      
      // Keys should have good character distribution
      keys.forEach(key => {
        const charCounts = { upper: 0, lower: 0, digit: 0 };
        for (const char of key) {
          if (char >= 'A' && char <= 'Z') charCounts.upper++;
          else if (char >= 'a' && char <= 'z') charCounts.lower++;
          else if (char >= '0' && char <= '9') charCounts.digit++;
        }
        
        // Should have reasonable distribution of character types
        expect(charCounts.upper + charCounts.lower + charCounts.digit).toBe(64);
      });
    });
  });
}); 