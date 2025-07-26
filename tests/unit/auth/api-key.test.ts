import { APIKeyManager } from '../../../src/auth/api-key';

describe('APIKeyManager', () => {
  const manager = new APIKeyManager();
  
  it('should load API key from env', async () => {
    process.env.MAILCOW_API_KEY = 'a'.repeat(32);
    const key = await manager.loadAPIKey();
    expect(key).toBe('a'.repeat(32));
  });

  it('should validate API key format', async () => {
    // Valid key
    const validResult = await manager.validateAPIKey('a'.repeat(32));
    expect(validResult.success).toBe(true);
    expect(validResult.authenticated).toBe(true);

    // Invalid key - too short
    const invalidResult = await manager.validateAPIKey('short');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.authenticated).toBe(false);
    expect(invalidResult.error?.code).toBe('INVALID_API_KEY');
  });

  it('should test API key with Mailcow', async () => {
    const result = await manager.testAPIKeyWithMailcow('a'.repeat(32));
    expect(result.success).toBe(true);
    expect(result.accessLevel).toBe('read-write');
  });

  it('should rotate API key', async () => {
    const oldKey = 'a'.repeat(32);
    const newKey = 'b'.repeat(32);
    const result = await manager.rotateAPIKey(oldKey, newKey);
    expect(result).toBe(true);
  });

  it('should store API key securely', async () => {
    const key = 'a'.repeat(32);
    await expect(manager.storeAPIKeySecurely(key)).resolves.toBeUndefined();
  });
}); 