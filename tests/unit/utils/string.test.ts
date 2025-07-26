import { isNonEmptyString, isValidLength, formatBytes, truncateString } from '../../../src/utils/string';

describe('String Utils', () => {
  describe('isNonEmptyString', () => {
    it('should return true for valid non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('   content   ')).toBe(true);
      expect(isNonEmptyString('123')).toBe(true);
    });

    it('should return false for empty or non-string values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
    });
  });

  describe('isValidLength', () => {
    it('should validate string length within range', () => {
      expect(isValidLength('hello', 3, 10)).toBe(true);
      expect(isValidLength('hi', 2, 5)).toBe(true);
      expect(isValidLength('exactly', 7, 7)).toBe(true);
    });

    it('should reject strings outside length range', () => {
      expect(isValidLength('hi', 3, 10)).toBe(false);
      expect(isValidLength('too long string', 3, 10)).toBe(false);
      expect(isValidLength('', 1, 5)).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes with appropriate units', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toContain('KB');
      expect(formatBytes(1024 * 1024)).toContain('MB');
      expect(formatBytes(1024 * 1024 * 1024)).toContain('GB');
    });

    it('should handle decimal values', () => {
      const result = formatBytes(1500);
      expect(result).toContain('1.5');
      expect(result).toContain('KB');
    });

    it('should handle large numbers', () => {
      const result = formatBytes(1024 * 1024 * 1024 * 1024);
      expect(result).toContain('TB');
    });
  });

  describe('truncateString', () => {
    it('should truncate strings longer than max length', () => {
      const result = truncateString('This is a very long string', 10);
      expect(result).toBe('This is...');
      expect(result.length).toBe(10);
    });

    it('should not truncate strings within max length', () => {
      const input = 'Short string';
      const result = truncateString(input, 20);
      expect(result).toBe(input);
    });

    it('should handle exact length strings', () => {
      const input = 'Exactly ten characters';
      const result = truncateString(input, input.length);
      expect(result).toBe(input);
    });

    it('should handle very short max lengths', () => {
      const result = truncateString('Hello', 3);
      expect(result).toBe('...');
    });

    it('should handle empty strings', () => {
      const result = truncateString('', 10);
      expect(result).toBe('');
    });
  });
}); 