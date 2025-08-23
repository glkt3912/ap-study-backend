// 標準化エラー型定義（フロントエンドと互換性を保つ）

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface StandardErrorResponse {
  success: false;
  error: {
    id: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    code: string;
    message: string;
    userMessage: string;
    timestamp: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    context?: {
      url?: string;
      method?: string;
      userId?: string;
      requestId?: string;
    };
  };
  metadata?: {
    version: string;
    timestamp: string;
  };
}

export interface StandardSuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    version: string;
    timestamp: string;
  };
}

export type StandardApiResponse<T = unknown> = StandardSuccessResponse<T> | StandardErrorResponse;

// エラークラス
export class StandardError extends Error {
  public readonly id: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly timestamp: string;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly context?: {
    url?: string;
    method?: string;
    userId?: string;
    requestId?: string;
  };

  constructor(options: {
    category: ErrorCategory;
    severity: ErrorSeverity;
    code: string;
    message: string;
    userMessage: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
    context?: {
      url?: string;
      method?: string;
      userId?: string;
      requestId?: string;
    };
  }) {
    super(options.message);
    this.name = 'StandardError';
    this.id = this.generateErrorId();
    this.category = options.category;
    this.severity = options.severity;
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.timestamp = new Date().toISOString();
    this.retryable = options.retryable || false;
    this.details = options.details;
    this.context = options.context;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  toJSON(): StandardErrorResponse['error'] {
    return {
      id: this.id,
      category: this.category,
      severity: this.severity,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      retryable: this.retryable,
      details: this.details,
      context: this.context,
    };
  }

  toResponse(): StandardErrorResponse {
    return {
      success: false,
      error: this.toJSON(),
      metadata: {
        version: 'unified-api-v1.0',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// 便利な標準エラー作成関数
export const createStandardError = {
  validation: (message: string, details?: Record<string, unknown>) => new StandardError({
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    code: 'VALIDATION_ERROR',
    message,
    userMessage: '入力内容に問題があります。エラーメッセージを確認してください。',
    retryable: false,
    details,
  }),

  authentication: (message: string = 'Authentication required') => new StandardError({
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    code: 'AUTH_REQUIRED',
    message,
    userMessage: 'ログインが必要です。再度ログインしてください。',
    retryable: false,
  }),

  unauthorized: (message: string = 'Unauthorized access') => new StandardError({
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    code: 'AUTH_UNAUTHORIZED',
    message,
    userMessage: 'この操作を行う権限がありません。',
    retryable: false,
  }),

  notFound: (resource: string = 'リソース') => new StandardError({
    category: ErrorCategory.NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    code: 'NOT_FOUND',
    message: `${resource} not found`,
    userMessage: `${resource}が見つかりません。`,
    retryable: false,
  }),

  server: (message: string = 'Internal server error', retryable: boolean = true) => new StandardError({
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    code: 'SERVER_ERROR',
    message,
    userMessage: 'サーバーで問題が発生しました。しばらく待ってから再度お試しください。',
    retryable,
  }),

  database: (message: string = 'Database error', retryable: boolean = true) => new StandardError({
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    code: 'DATABASE_ERROR',
    message,
    userMessage: 'データベースエラーが発生しました。しばらく待ってから再度お試しください。',
    retryable,
  }),
};