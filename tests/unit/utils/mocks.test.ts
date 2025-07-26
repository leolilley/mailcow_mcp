import { MockLogger } from '../../../src/utils/mocks';
import { LogLevel } from '../../../src/types/utils';

describe('Mocks', () => {
  describe('MockLogger', () => {
    let mockLogger: MockLogger;

    beforeEach(() => {
      mockLogger = new MockLogger();
    });

    it('should be empty initially', () => {
      expect(mockLogger.getLogs()).toHaveLength(0);
    });

    it('should log messages with all log levels', () => {
      mockLogger.log(LogLevel.DEBUG, 'Debug message');
      mockLogger.log(LogLevel.INFO, 'Info message');
      mockLogger.log(LogLevel.WARN, 'Warning message');
      mockLogger.log(LogLevel.ERROR, 'Error message');

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(4);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[1].level).toBe(LogLevel.INFO);
      expect(logs[2].level).toBe(LogLevel.WARN);
      expect(logs[3].level).toBe(LogLevel.ERROR);
    });

    it('should preserve log order', () => {
      const messages = ['First', 'Second', 'Third'];
      messages.forEach(msg => mockLogger.log(LogLevel.INFO, msg));

      const logs = mockLogger.getLogs();
      logs.forEach((log, index) => {
        expect(log.message).toBe(messages[index]);
      });
    });

    it('should store context with logs', () => {
      const context = { userId: '123', action: 'login', ip: '192.168.1.1' };
      mockLogger.log(LogLevel.INFO, 'User action', context);

      const logs = mockLogger.getLogs();
      expect(logs[0].args).toEqual([context]);
    });

    it('should handle logs without context', () => {
      mockLogger.log(LogLevel.INFO, 'Simple message');

      const logs = mockLogger.getLogs();
      expect(logs[0].args).toEqual([]);
    });

    it('should include accurate timestamps', () => {
      const beforeLog = Date.now();
      mockLogger.log(LogLevel.INFO, 'Timestamp test');
      const afterLog = Date.now();

      const logs = mockLogger.getLogs();
      const logTime = logs[0].timestamp.getTime();
      
      expect(logTime).toBeGreaterThanOrEqual(beforeLog);
      expect(logTime).toBeLessThanOrEqual(afterLog);
    });

    it('should clear all logs when clear is called', () => {
      mockLogger.log(LogLevel.INFO, 'Message 1');
      mockLogger.log(LogLevel.ERROR, 'Message 2');
      mockLogger.log(LogLevel.WARN, 'Message 3');
      
      expect(mockLogger.getLogs()).toHaveLength(3);
      
      mockLogger.clear();
      expect(mockLogger.getLogs()).toHaveLength(0);
    });

    it('should allow logging after clearing', () => {
      mockLogger.log(LogLevel.INFO, 'Before clear');
      mockLogger.clear();
      mockLogger.log(LogLevel.INFO, 'After clear');

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('After clear');
    });

    it('should handle multiple contexts in single log', () => {
      const context1 = { userId: '123' };
      
      // Simulate logging with context
      mockLogger.log(LogLevel.INFO, 'Single context', context1);
      
      const logs = mockLogger.getLogs();
      expect(logs[0].args).toEqual([context1]);
    });

    it('should handle complex nested context objects', () => {
      const complexContext = {
        user: {
          id: '123',
          name: 'John Doe',
          permissions: ['read', 'write']
        },
        request: {
          method: 'POST',
          url: '/api/users',
          headers: { 'Content-Type': 'application/json' }
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      mockLogger.log(LogLevel.INFO, 'Complex operation', complexContext);

      const logs = mockLogger.getLogs();
      expect(logs[0].args).toEqual([complexContext]);
      expect(logs[0].args[0]).toEqual(complexContext);
    });

    it('should maintain separate instances', () => {
      const logger1 = new MockLogger();
      const logger2 = new MockLogger();

      logger1.log(LogLevel.INFO, 'Logger 1 message');
      logger2.log(LogLevel.ERROR, 'Logger 2 message');

      expect(logger1.getLogs()).toHaveLength(1);
      expect(logger2.getLogs()).toHaveLength(1);
      expect(logger1.getLogs()[0].message).toBe('Logger 1 message');
      expect(logger2.getLogs()[0].message).toBe('Logger 2 message');
    });
  });
}); 