// @ts-ignore: Node.js fs import for file logging
import * as fs from 'fs';
import { LogEntry } from '../types';
import { LogLevel } from '../types/utils';

export interface LoggerConfig {
  level: LogLevel;
  filePath?: string;
}

export interface LogDestination {
  write(entry: LogEntry): void;
}

export class ConsoleLogDestination implements LogDestination {
  write(entry: LogEntry): void {
    // @ts-ignore: Node.js environment, console is available
    const formatted = this.formatEntry(entry);
    console.log(formatted);
  }
  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry, null, 2);
  }
}

export class FileLogDestination implements LogDestination {
  constructor(private filePath: string) {}
  write(entry: LogEntry): void {
    const formatted = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.filePath, formatted);
  }
}

export class Logger {
  constructor(
    private config: LoggerConfig,
    private destination: LogDestination
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return (
      levels.indexOf(level) >= levels.indexOf(this.config.level)
    );
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      args: context ? [context] : [],
    };
    if (this.shouldLog(level)) {
      this.destination.write(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, error ? `${message}: ${error.message}` : message, { ...context, error });
  }
} 