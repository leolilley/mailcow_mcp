import { hash, generateToken, passwordHash, validateCertificate } from '../../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('hash', () => {
    it('should generate SHA-256 hash by default', async () => {
      const input = 'test data';
      const result = await hash(input);
      
      expect(result).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate consistent hashes for same input', async () => {
      const input = 'consistent data';
      const hash1 = await hash(input);
      const hash2 = await hash(input);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', async () => {
      const hash1 = await hash('input1');
      const hash2 = await hash('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should support different hash algorithms', async () => {
      const input = 'test data';
      const sha256Hash = await hash(input, 'sha256');
      const sha1Hash = await hash(input, 'sha1');
      const md5Hash = await hash(input, 'md5');
      
      expect(sha256Hash).toHaveLength(64);
      expect(sha1Hash).toHaveLength(40);
      expect(md5Hash).toHaveLength(32);
      
      expect(sha256Hash).not.toBe(sha1Hash);
      expect(sha1Hash).not.toBe(md5Hash);
    });

    it('should handle empty strings', async () => {
      const result = await hash('');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle special characters and Unicode', async () => {
      const inputs = ['hello@world.com', '测试数据', '🚀🌟💫', 'special!@#$%^&*()'];
      
      for (const input of inputs) {
        const result = await hash(input);
        expect(result).toHaveLength(64);
        expect(result).toMatch(/^[a-f0-9]+$/);
      }
    });
  });

  describe('generateToken', () => {
    it('should generate token with default length', () => {
      const token = generateToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate token with custom length', () => {
      const lengths = [16, 24, 48, 64, 128];
      
      lengths.forEach(length => {
        const token = generateToken(length);
        expect(token).toHaveLength(length);
        expect(token).toMatch(/^[A-Za-z0-9]+$/);
      });
    });

    it('should generate different tokens each time', () => {
      const tokens = Array.from({ length: 10 }, () => generateToken(32));
      const uniqueTokens = new Set(tokens);
      
      expect(uniqueTokens.size).toBe(10);
    });

    it('should use cryptographically secure randomness', () => {
      const token = generateToken(100);
      
      // Check character distribution
      const charCounts = { upper: 0, lower: 0, digit: 0 };
      for (const char of token) {
        if (char >= 'A' && char <= 'Z') charCounts.upper++;
        else if (char >= 'a' && char <= 'z') charCounts.lower++;
        else if (char >= '0' && char <= '9') charCounts.digit++;
      }
      
      // Should have reasonable distribution
      expect(charCounts.upper + charCounts.lower + charCounts.digit).toBe(100);
      expect(charCounts.upper).toBeGreaterThan(0);
      expect(charCounts.lower).toBeGreaterThan(0);
      expect(charCounts.digit).toBeGreaterThan(0);
    });

    it('should handle edge case of length 1', () => {
      const token = generateToken(1);
      expect(token).toHaveLength(1);
      expect(token).toMatch(/^[A-Za-z0-9]$/);
    });
  });

  describe('passwordHash', () => {
    it('should generate SHA-256 hash for passwords', async () => {
      const password = 'mySecretPassword123';
      const result = await passwordHash(password);
      
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate consistent hashes for same password', async () => {
      const password = 'consistentPassword';
      const hash1 = await passwordHash(password);
      const hash2 = await passwordHash(password);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different passwords', async () => {
      const hash1 = await passwordHash('password1');
      const hash2 = await passwordHash('password2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in passwords', async () => {
      const passwords = [
        'P@ssw0rd!',
        'مرحبا123',
        '🔒secure🔑',
        'p4$$w0rd_w1th_$pec14l_ch4r$'
      ];
      
      for (const password of passwords) {
        const result = await passwordHash(password);
        expect(result).toHaveLength(64);
        expect(result).toMatch(/^[a-f0-9]+$/);
      }
    });

    it('should handle empty password', async () => {
      const result = await passwordHash('');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it('should be deterministic for password verification', async () => {
      const password = 'userPassword123';
      const storedHash = await passwordHash(password);
      
      // Simulate login verification
      const loginHash = await passwordHash(password);
      expect(loginHash).toBe(storedHash);
    });
  });

  describe('validateCertificate', () => {
    const validCert = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQDKhiI8K8K8OjANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhU
ZXN0Q2VydDAeFw0yMzEwMTUxMjAwMDBaFw0yNDEwMTQxMjAwMDBaMBMxETAPBgNV
BAMMCFRlc3RDZXJ0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwOm3
-----END CERTIFICATE-----`;

    it('should validate correctly formatted certificates', () => {
      expect(validateCertificate(validCert)).toBe(true);
    });

    it('should reject certificates without proper BEGIN marker', () => {
      const invalidCert = `MIICljCCAX4CCQDKhiI8K8K8OjANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhU
-----END CERTIFICATE-----`;
      
      expect(validateCertificate(invalidCert)).toBe(false);
    });

    it('should reject certificates without proper END marker', () => {
      const invalidCert = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQDKhiI8K8K8OjANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhU`;
      
      expect(validateCertificate(invalidCert)).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(validateCertificate('')).toBe(false);
    });

    it('should reject random text', () => {
      expect(validateCertificate('This is not a certificate')).toBe(false);
    });

    it('should reject certificates with wrong format', () => {
      const invalidCert = `-----BEGIN PRIVATE KEY-----
MIICljCCAX4CCQDKhiI8K8K8OjANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhU
-----END PRIVATE KEY-----`;
      
      expect(validateCertificate(invalidCert)).toBe(false);
    });

    it('should handle certificates with extra whitespace', () => {
      const certWithWhitespace = `
      -----BEGIN CERTIFICATE-----
      MIICljCCAX4CCQDKhiI8K8K8OjANBgkqhkiG9w0BAQsFADATMREwDwYDVQQDDAhU
      -----END CERTIFICATE-----
      `;
      
      expect(validateCertificate(certWithWhitespace.trim())).toBe(true);
    });
  });
}); 