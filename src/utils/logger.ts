// @ts-ignore: Node.js fs import for file logging
import * as fs from 'fs';
import { LogEntry } from '../types';
import { UtilLogLevel } from '../types/utils';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface LoggerConfig {
  level: UtilLogLevel;
  filePath?: string;
}

export interface LogDestination {
  write(entry: LogEntry): void;
}

export class ConsoleLogDestination implements LogDestination {
  write(entry: LogEntry): void {
    // @ts-ignore: Node.js environment, console is available
    const formatted = this.formatEntry(entry);
    console.error(formatted);
  }
  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry, null, 2);
  }
}

export class McpLogDestination implements LogDestination {
  private static readonly levelMap: Record<UtilLogLevel, "debug" | "info" | "warning" | "error"> = {
    debug: 'debug',
    info: 'info',
    warn: 'warning',
    error: 'error',
  };

  constructor(private server: Server) {}

  write(entry: LogEntry): void {
    const mcpLevel = McpLogDestination.levelMap[entry.level] ?? 'info';
    const data = entry.args.length > 0
      ? { message: entry.message, ...((typeof entry.args[0] === 'object' && entry.args[0] !== null) ? entry.args[0] as Record<string, unknown> : { details: entry.args }) }
      : entry.message;

    this.server.sendLoggingMessage({
      level: mcpLevel,
      logger: 'mailcow-mcp',
      data,
    }).catch(() => {
      // Best-effort: swallow errors (e.g., client not connected yet)
    });
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
      args,
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