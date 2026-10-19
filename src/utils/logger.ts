import * as fs from 'fs';
import { LogEntry } from '../types';
import { UtilLogLevel } from '../types/utils';

export interface LoggerConfig {
  level: UtilLogLevel;
  filePath?: string;
}

export interface LogDestination {
  write(entry: LogEntry): void;
}

export class ConsoleLogDestination implements LogDestination {
  write(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    // stderr, not stdout. Over the stdio transport, stdout IS the JSON-RPC
    // channel: a log line written there is a frame the client has to fail to
    // parse. Diagnostics belong on the other stream.
    console.error(formatted);
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

import { Logger as ILogger } from '../types/utils';

/** Render a value so JSON.stringify keeps its information. */
function serializeForLog(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause !== undefined ? { cause: serializeForLog(value.cause) } : {}),
    };
  }
  return value;
}

export class Logger implements ILogger {
  constructor(
    private config: LoggerConfig,
    private destination: LogDestination
  ) {}

  private shouldLog(level: UtilLogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return (
      levels.indexOf(level) >= levels.indexOf(this.config.level)
    );
  }

  log(level: UtilLogLevel, message: string, ...args: unknown[]): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      // An Error has no enumerable own properties, so JSON.stringify renders
      // it as `{}`. Every fatal startup diagnostic this server produces was
      // being logged as `args: [{}]` and the operator saw nothing but
      // "Failed to start server".
      args: args.map(serializeForLog),
    };
    if (this.shouldLog(level)) {
      this.destination.write(entry);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }
} 