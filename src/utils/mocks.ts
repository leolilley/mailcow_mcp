import { LogEntry } from '../types';
import { LogLevel } from '../types/utils';

export class MockLogger {
  private logs: LogEntry[] = [];

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.logs.push({ timestamp: new Date(), level, message, args: context ? [context] : [] });
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
} 