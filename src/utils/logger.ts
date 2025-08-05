/**
 * 高度なロギングシステム
 * 構造化ログ、レベル分け、リクエスト追跡、メトリクス統合
 */

import { Context } from 'hono';

// ログレベル定義
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// ログエントリ型定義
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// パフォーマンスメトリクス
interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  totalResponseTime: number;
  statusCodes: Record<number, number>;
  endpoints: Record<string, {
    count: number;
    totalTime: number;
    errors: number;
  }>;
}

class Logger {
  private minLevel: LogLevel;
  private enableConsole: boolean;
  private enableStructured: boolean;
  private metrics: PerformanceMetrics;

  constructor() {
    this.minLevel = this.getLogLevel();
    this.enableConsole = process.env.LOG_CONSOLE !== 'false';
    this.enableStructured = process.env.LOG_STRUCTURED === 'true' || process.env.NODE_ENV === 'production';
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      statusCodes: {},
      endpoints: {},
    };
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(entry: LogEntry): string {
    if (this.enableStructured) {
      return JSON.stringify(entry);
    }

    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.levelName.padEnd(5);
    const requestInfo = entry.requestId ? `[${entry.requestId}] ` : '';
    const userInfo = entry.userId ? `[user:${entry.userId}] ` : '';
    const methodPath = entry.method && entry.path ? `${entry.method} ${entry.path} ` : '';
    const duration = entry.duration ? `(${entry.duration}ms) ` : '';
    const status = entry.statusCode ? `[${entry.statusCode}] ` : '';

    return `${timestamp} [${level}] ${requestInfo}${userInfo}${methodPath}${status}${duration}${entry.message}`;
  }

  private log(level: LogLevel, message: string, context?: {
    requestId?: string;
    userId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    userAgent?: string;
    ip?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      ...context,
      error: context?.error ? {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      } : undefined,
    };

    const formattedMessage = this.formatMessage(entry);

    if (this.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          // eslint-disable-next-line no-console
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.log(formattedMessage);
          break;
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          // eslint-disable-next-line no-console
          console.error(formattedMessage);
          break;
      }
    }

    // メトリクス更新（エラー時）
    if (level >= LogLevel.ERROR) {
      this.metrics.errorCount++;
    }

    // 将来的な外部ログサービス連携のプレースホルダー
    this.sendToExternalService(entry);
  }

  private sendToExternalService(entry: LogEntry): void {
    // 本番環境では外部ログサービス（例：CloudWatch、Datadog、Sentry）に送信
    // 現在は開発段階なので実装なし
    if (process.env.EXTERNAL_LOG_ENDPOINT && entry.level >= LogLevel.ERROR) {
      // fetch(process.env.EXTERNAL_LOG_ENDPOINT, { ... })
    }
  }

  // パブリックログメソッド
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, { metadata });
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, { metadata });
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, { metadata });
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, { error, metadata });
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, { error, metadata });
  }

  // リクエスト関連ログメソッド
  logRequest(context: {
    requestId: string;
    method: string;
    path: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
  }): void {
    this.log(LogLevel.INFO, 'Request started', context);
  }

  logResponse(context: {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
  }): void {
    // メトリクス更新
    this.updateMetrics(context);

    const level = context.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, 'Request completed', context);
  }

  logError(message: string, context: {
    requestId?: string;
    method?: string;
    path?: string;
    userId?: string;
    error: Error;
  }): void {
    this.log(LogLevel.ERROR, message, context);
  }

  // データベース操作ログ
  logDatabase(operation: string, table: string, duration: number, error?: Error): void {
    const message = `Database ${operation} on ${table}`;
    if (error) {
      this.log(LogLevel.ERROR, `${message} failed`, { 
        metadata: { table, operation, duration },
        error 
      });
    } else {
      this.log(LogLevel.DEBUG, `${message} completed`, { 
        metadata: { table, operation, duration }
      });
    }
  }

  // ビジネスロジックログ
  logBusinessEvent(event: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, `Business event: ${event}`, { metadata });
  }

  // セキュリティログ
  logSecurity(event: string, context: {
    ip?: string;
    userAgent?: string;
    userId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }): void {
    const level = context.severity === 'critical' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security event: ${event}`, context);
  }

  // メトリクス更新
  private updateMetrics(context: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
  }): void {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += context.duration;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

    // ステータスコード統計
    this.metrics.statusCodes[context.statusCode] = 
      (this.metrics.statusCodes[context.statusCode] || 0) + 1;

    // エンドポイント統計
    const endpoint = `${context.method} ${context.path}`;
    if (!this.metrics.endpoints[endpoint]) {
      this.metrics.endpoints[endpoint] = { count: 0, totalTime: 0, errors: 0 };
    }
    
    const endpointMetrics = this.metrics.endpoints[endpoint];
    endpointMetrics.count++;
    endpointMetrics.totalTime += context.duration;
    
    if (context.statusCode >= 400) {
      endpointMetrics.errors++;
    }
  }

  // メトリクス取得
  getMetrics(): PerformanceMetrics & {
    endpointAverages: Record<string, {
      count: number;
      averageTime: number;
      errorRate: number;
    }>;
  } {
    const endpointAverages: Record<string, {
      count: number;
      averageTime: number;
      errorRate: number;
    }> = {};

    for (const [endpoint, metrics] of Object.entries(this.metrics.endpoints)) {
      endpointAverages[endpoint] = {
        count: metrics.count,
        averageTime: metrics.totalTime / metrics.count,
        errorRate: metrics.errors / metrics.count,
      };
    }

    return {
      ...this.metrics,
      endpointAverages,
    };
  }

  // メトリクスリセット
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      statusCodes: {},
      endpoints: {},
    };
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// Honoミドルウェア用のヘルパー関数
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function getUserIdFromContext(c: Context): string | undefined {
  // JWT トークンやセッションからユーザーIDを取得
  // 現在は実装されていないため、ヘッダーから取得
  return c.req.header('X-User-ID') || 'anonymous';
}

export function getClientIp(c: Context): string {
  return c.req.header('x-forwarded-for') || 
         c.req.header('x-real-ip') || 
         'unknown';
}

// デフォルトエクスポート（後方互換性）
export default logger;
