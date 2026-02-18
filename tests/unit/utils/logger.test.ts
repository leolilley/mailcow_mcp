import { MockLogger } from '../../../src/utils/mocks';
import { LogLevel } from '../../../src/types/utils';
import { McpLogDestination } from '../../../src/utils/logger';

describe('Logger', () => {
  describe('McpLogDestination', () => {
    it('should call server.sendLoggingMessage with correct level mapping', () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      };
      const destination = new McpLogDestination(mockServer as any);

      destination.write({ timestamp: new Date(), level: 'info', message: 'test', args: [] });
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        logger: 'mailcow-mcp',
        data: 'test',
      });
    });

    it('should map warn to warning', () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      };
      const destination = new McpLogDestination(mockServer as any);

      destination.write({ timestamp: new Date(), level: 'warn', message: 'oops', args: [] });
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'warning',
        logger: 'mailcow-mcp',
        data: 'oops',
      });
    });

    it('should include args in data when present', () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockResolvedValue(undefined),
      };
      const destination = new McpLogDestination(mockServer as any);

      destination.write({ timestamp: new Date(), level: 'error', message: 'fail', args: [{ code: 500 }] });
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'error',
        logger: 'mailcow-mcp',
        data: { message: 'fail', code: 500 },
      });
    });

    it('should not throw if sendLoggingMessage rejects', () => {
      const mockServer = {
        sendLoggingMessage: jest.fn().mockRejectedValue(new Error('not connected')),
      };
      const destination = new McpLogDestination(mockServer as any);

      expect(() => destination.write({ timestamp: new Date(), level: 'debug', message: 'x', args: [] })).not.toThrow();
    });
  });

  describe('MockLogger', () => {
    let logger: MockLogger;

    beforeEach(() => {
      logger = new MockLogger();
    });

    it('should log messages with different levels', () => {
      logger.log(LogLevel.INFO, 'Info message');
      logger.log(LogLevel.ERROR, 'Error message');
      logger.log(LogLevel.WARN, 'Warning message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Info message');
      expect(logs[1].level).toBe(LogLevel.ERROR);
      expect(logs[1].message).toBe('Error message');
      expect(logs[2].level).toBe(LogLevel.WARN);
      expect(logs[2].message).toBe('Warning message');
    });

    it('should log messages with context', () => {
      const context = { userId: '123', action: 'login' };
      logger.log(LogLevel.INFO, 'User logged in', context);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('User logged in');
      expect(logs[0].args).toEqual([context]);
    });

    it('should include timestamp in log entries', () => {
      const beforeLog = new Date();
      logger.log(LogLevel.INFO, 'Test message');
      const afterLog = new Date();

      const logs = logger.getLogs();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
      expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(afterLog.getTime());
    });

    it('should clear logs', () => {
      logger.log(LogLevel.INFO, 'Message 1');
      logger.log(LogLevel.ERROR, 'Message 2');
      expect(logger.getLogs()).toHaveLength(2);

      logger.clear();
      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should handle logs without context', () => {
      logger.log(LogLevel.DEBUG, 'Debug message');

      const logs = logger.getLogs();
      expect(logs[0].args).toEqual([]);
    });
  });
}); 