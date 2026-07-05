export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, unknown>;
}

export type LogHandler = (entry: LogEntry) => void;

export class Logger {
  private level: LogLevel;
  private context: string;
  private handler: LogHandler;

  constructor(context: string, level: LogLevel = LogLevel.INFO, handler?: LogHandler) {
    this.context = context;
    this.level = level;
    this.handler = handler || this.defaultHandler;
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level, this.handler);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (level < this.level) return;
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata,
    };
    this.handler(entry);
  }

  private defaultHandler(entry: LogEntry): void {
    const prefix = `[${LogLevel[entry.level]}] [${entry.context}]`;
    const timestamp = entry.timestamp.toISOString();
    const msg = `${timestamp} ${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(msg, entry.metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(msg, entry.metadata || '');
        break;
      case LogLevel.DEBUG:
        console.debug(msg, entry.metadata || '');
        break;
      default:
        console.log(msg, entry.metadata || '');
    }
  }
}

export const rootLogger = new Logger('casuya-media');
