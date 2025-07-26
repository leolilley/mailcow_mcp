/**
 * Utility Types
 * Defines utility function types, logging, error handling, and helper types
 */

// Logging Types
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  log(level: UtilLogLevel, message: string, ...args: unknown[]): void;
}

export type UtilLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: UtilLogLevel;
  message: string;
  args: unknown[];
  requestId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogTransport {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

// Error Handling Types
export interface ErrorHandler {
  handle(error: Error, context?: ErrorContext): void | Promise<void>;
  format(error: Error): string;
  isRetryable(error: Error): boolean;
  shouldLog(error: Error): boolean;
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  details?: unknown;
  timestamp: Date;
  context?: ErrorContext;
}

// HTTP Utility Types
export interface HTTPUtils {
  parseURL(url: string): URLInfo;
  buildURL(base: string, path: string, query?: Record<string, string>): string;
  parseQueryString(query: string): Record<string, string>;
  buildQueryString(params: Record<string, string>): string;
  isValidURL(url: string): boolean;
  normalizeURL(url: string): string;
}

export interface URLInfo {
  protocol: string;
  hostname: string;
  port?: number;
  pathname: string;
  search: string;
  hash: string;
  query: Record<string, string>;
}

export interface HTTPHeaders {
  [key: string]: string;
}

export interface HTTPRequestInfo {
  method: string;
  url: string;
  headers: HTTPHeaders;
  body?: unknown;
  timeout?: number;
}

export interface HTTPResponseInfo {
  status: number;
  statusText: string;
  headers: HTTPHeaders;
  body?: unknown;
  duration: number;
}

// Validation Types
export interface ValidationHelper {
  isString(value: unknown): value is string;
  isNumber(value: unknown): value is number;
  isBoolean(value: unknown): value is boolean;
  isObject(value: unknown): value is Record<string, unknown>;
  isArray(value: unknown): value is unknown[];
  isDate(value: unknown): value is Date;
  isFunction(value: unknown): value is Function;
  isEmpty(value: unknown): boolean;
  isValidEmail(email: string): boolean;
  isValidURL(url: string): boolean;
  isValidUUID(uuid: string): boolean;
  isValidIP(ip: string): boolean;
}

// Security Types
export interface SecurityUtils {
  hash(data: string, algorithm?: string): Promise<string>;
  compare(data: string, hash: string): Promise<boolean>;
  generateToken(length?: number): string;
  generateUUID(): string;
  sanitizeString(input: string): string;
  validatePassword(password: string, policy?: UtilPasswordPolicy): { valid: boolean; errors: string[] };
  encrypt(data: string, key: string): Promise<string>;
  decrypt(data: string, key: string): Promise<string>;
}

export interface UtilPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number;
  preventReuse?: number;
}

// Crypto Types
export interface CryptoUtils {
  generateKey(length?: number): string;
  generateIV(): string;
  hash(data: string, algorithm?: string): Promise<string>;
  hmac(data: string, key: string, algorithm?: string): Promise<string>;
  encrypt(data: string, key: string, iv?: string): Promise<string>;
  decrypt(data: string, key: string, iv?: string): Promise<string>;
  sign(data: string, privateKey: string): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;
}

// String Utility Types
export interface StringUtils {
  capitalize(str: string): string;
  camelCase(str: string): string;
  kebabCase(str: string): string;
  snakeCase(str: string): string;
  pascalCase(str: string): string;
  truncate(str: string, length: number, suffix?: string): string;
  slugify(str: string): string;
  escape(str: string): string;
  unescape(str: string): string;
  random(length?: number): string;
  uuid(): string;
}

// Date Utility Types
export interface DateUtils {
  now(): Date;
  parse(date: string | number | Date): Date;
  format(date: Date, format?: string): string;
  add(date: Date, amount: number, unit: DateUnit): Date;
  subtract(date: Date, amount: number, unit: DateUnit): Date;
  diff(date1: Date, date2: Date, unit?: DateUnit): number;
  isValid(date: unknown): date is Date;
  isToday(date: Date): boolean;
  isYesterday(date: Date): boolean;
  isTomorrow(date: Date): boolean;
  startOf(date: Date, unit: DateUnit): Date;
  endOf(date: Date, unit: DateUnit): Date;
}

export type DateUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

// Object Utility Types
export interface ObjectUtils {
  clone<T>(obj: T): T;
  merge<T>(target: T, ...sources: Partial<T>[]): T;
  pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
  omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
  keys<T>(obj: T): (keyof T)[];
  values<T>(obj: T): T[keyof T][];
  entries<T>(obj: T): [keyof T, T[keyof T]][];
  isEmpty(obj: unknown): boolean;
  isEqual(obj1: unknown, obj2: unknown): boolean;
  deepClone<T>(obj: T): T;
}

// Array Utility Types
export interface ArrayUtils {
  chunk<T>(array: T[], size: number): T[][];
  unique<T>(array: T[]): T[];
  flatten<T>(array: T[][]): T[];
  groupBy<T>(array: T[], key: keyof T): Record<string, T[]>;
  sortBy<T>(array: T[], key: keyof T, order?: 'asc' | 'desc'): T[];
  filter<T>(array: T[], predicate: (item: T) => boolean): T[];
  map<T, U>(array: T[], transform: (item: T) => U): U[];
  reduce<T, U>(array: T[], reducer: (acc: U, item: T) => U, initial: U): U;
}

// Promise Utility Types
export interface PromiseUtils {
  delay(ms: number): Promise<void>;
  timeout<T>(promise: Promise<T>, ms: number): Promise<T>;
  retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
  allSettled<T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]>;
  race<T>(promises: Promise<T>[]): Promise<T>;
  any<T>(promises: Promise<T>[]): Promise<T>;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

// Cache Utility Types
export interface CacheUtils {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
  size(): number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: Date;
  ttl?: number;
  expires?: Date;
}

// Type Guards
export function isLogger(obj: unknown): obj is Logger {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'debug' in obj &&
    'info' in obj &&
    'warn' in obj &&
    'error' in obj &&
    typeof obj.debug === 'function' &&
    typeof obj.info === 'function' &&
    typeof obj.warn === 'function' &&
    typeof obj.error === 'function'
  );
}

export function isErrorHandler(obj: unknown): obj is ErrorHandler {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'handle' in obj &&
    'format' in obj &&
    typeof obj.handle === 'function' &&
    typeof obj.format === 'function'
  );
}

export function isValidationHelper(obj: unknown): obj is ValidationHelper {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'isString' in obj &&
    'isNumber' in obj &&
    'isBoolean' in obj &&
    typeof obj.isString === 'function' &&
    typeof obj.isNumber === 'function' &&
    typeof obj.isBoolean === 'function'
  );
}

export function isStringUtils(obj: unknown): obj is StringUtils {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'capitalize' in obj &&
    'camelCase' in obj &&
    'kebabCase' in obj &&
    typeof obj.capitalize === 'function' &&
    typeof obj.camelCase === 'function' &&
    typeof obj.kebabCase === 'function'
  );
}

export function isDateUtils(obj: unknown): obj is DateUtils {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'now' in obj &&
    'parse' in obj &&
    'format' in obj &&
    typeof obj.now === 'function' &&
    typeof obj.parse === 'function' &&
    typeof obj.format === 'function'
  );
}

export function isValidUtilLogLevel(level: string): level is UtilLogLevel {
  return ['debug', 'info', 'warn', 'error'].includes(level);
}

export function isValidDateUnit(unit: string): unit is DateUnit {
  return [
    'millisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'
  ].includes(unit);
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
} 