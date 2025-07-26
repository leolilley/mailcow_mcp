import { validateEmail, validateDomain, validateAPIKey, validateWithSchema } from '../../../src/utils/validation';
import { z } from 'zod';

describe('Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user..double.dot@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateDomain', () => {
    it('should validate correct domain names', () => {
      expect(validateDomain('example.com')).toBe(true);
      expect(validateDomain('subdomain.example.org')).toBe(true);
      expect(validateDomain('test-domain.co.uk')).toBe(true);
    });

    it('should reject invalid domain names', () => {
      expect(validateDomain('invalid')).toBe(false);
      expect(validateDomain('.example.com')).toBe(false);
      expect(validateDomain('example..com')).toBe(false);
      expect(validateDomain('')).toBe(false);
    });
  });

  describe('validateAPIKey', () => {
    it('should validate correct API keys', () => {
      expect(validateAPIKey('a'.repeat(32))).toBe(true);
      expect(validateAPIKey('abc123XYZ789'.repeat(4))).toBe(true);
      expect(validateAPIKey('A'.repeat(64))).toBe(true);
    });

    it('should reject invalid API keys', () => {
      expect(validateAPIKey('short')).toBe(false);
      expect(validateAPIKey('a'.repeat(31))).toBe(false);
      expect(validateAPIKey('special-chars-not-allowed!')).toBe(false);
      expect(validateAPIKey('')).toBe(false);
    });
  });

  describe('validateWithSchema', () => {
    const userSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0)
    });

    it('should validate correct data against schema', () => {
      const validData = { name: 'John', email: 'john@example.com', age: 25 };
      const result = validateWithSchema(validData, userSchema);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid data against schema', () => {
      const invalidData = { name: '', email: 'invalid-email', age: -5 };
      const result = validateWithSchema(invalidData, userSchema);
      
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle missing fields', () => {
      const incompleteData = { name: 'John' };
      const result = validateWithSchema(incompleteData, userSchema);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle non-object data', () => {
      const result = validateWithSchema('invalid-data', userSchema);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
}); 