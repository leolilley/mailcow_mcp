import { createSession, validateSessionToken, refreshSession, cleanupExpiredSessions } from '../../../src/auth/session';

describe('Session Management', () => {
  it('should create and validate a session', async () => {
    const session = await createSession('a'.repeat(32), 'read-write');
    expect(session.token).toBeDefined();
    expect(session.userId).toBeDefined();
    expect(session.accessLevel).toBe('read-write');
    expect(session.created).toBeInstanceOf(Date);
    expect(session.expires).toBeInstanceOf(Date);
    expect(session.lastActivity).toBeInstanceOf(Date);
    
    const valid = await validateSessionToken(session.token);
    expect(valid).toBe(true);
  });
  
  it('should refresh a session', async () => {
    const session = await createSession('a'.repeat(32), 'read-write');
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    const refreshed = await refreshSession(session.token);
    expect(refreshed).not.toBeNull();
    expect(refreshed?.token).toBe(session.token);
    expect(refreshed?.expires.getTime()).toBeGreaterThanOrEqual(session.expires.getTime());
  });

  it('should return null when refreshing non-existent session', async () => {
    const refreshed = await refreshSession('non-existent-token');
    expect(refreshed).toBeNull();
  });

  it('should return false for invalid session token', async () => {
    const valid = await validateSessionToken('invalid-token');
    expect(valid).toBe(false);
  });

  it('should create session with read-only access', async () => {
    const session = await createSession('b'.repeat(32), 'read-only');
    expect(session.accessLevel).toBe('read-only');
    expect(session.permissions).toEqual([]);
  });

  it('should cleanup expired sessions', async () => {
    await expect(cleanupExpiredSessions()).resolves.toBeUndefined();
  });
}); 