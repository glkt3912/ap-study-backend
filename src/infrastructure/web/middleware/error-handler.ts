import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { StandardError, createStandardError, ErrorCategory, ErrorSeverity } from '../../../utils/error-types.js';
import { logger } from '../../../utils/logger.js';

/**
 * 標準エラーハンドリングミドルウェア
 * 
 * 全ての例外を捕捉し、統一されたエラーレスポンス形式で返す
 */
export const errorHandlerMiddleware = async (error: Error, c: Context) => {
  logger.error('Error caught by error handler:', error);

  // StandardErrorは既に標準化されているので、そのまま返す
  if (error instanceof StandardError) {
    const statusCode = getHttpStatusFromError(error);
    return c.json(error.toResponse(), statusCode as any);
  }

  // HTTPExceptionの処理
  if (error instanceof HTTPException) {
    const standardError = convertHttpExceptionToStandardError(error, c);
    return c.json(standardError.toResponse(), error.status as any);
  }

  // Prismaエラーの処理
  if (error.message.includes('Prisma')) {
    const standardError = createStandardError.database(error.message);
    addContextToError(standardError, c);
    return c.json(standardError.toResponse(), 500 as any);
  }

  // バリデーションエラーの処理
  if (error.message.includes('validation') || error.message.includes('required')) {
    const standardError = createStandardError.validation(error.message);
    addContextToError(standardError, c);
    return c.json(standardError.toResponse(), 400 as any);
  }

  // 予期しないエラーの処理
  const standardError = createStandardError.server(error.message);
  addContextToError(standardError, c);
  
  logger.error('Unexpected error occurred', error, {
    url: c.req.url,
    method: c.req.method,
  });

  return c.json(standardError.toResponse(), 500 as any);
};

/**
 * エラーからHTTPステータスコードを取得
 */
function getHttpStatusFromError(error: StandardError): number {
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return 401;
    case ErrorCategory.AUTHORIZATION:
      return 403;
    case ErrorCategory.NOT_FOUND:
      return 404;
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.RATE_LIMIT:
      return 429;
    case ErrorCategory.SERVER:
      return 500;
    default:
      return 500;
  }
}

/**
 * HTTPExceptionを標準エラーに変換
 */
function convertHttpExceptionToStandardError(exception: HTTPException, c: Context): StandardError {
  let category: ErrorCategory;
  let severity: ErrorSeverity;
  let code: string;
  let userMessage: string;

  switch (exception.status) {
    case 400:
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      code = 'BAD_REQUEST';
      userMessage = '不正な要求です。入力内容を確認してください。';
      break;
    case 401:
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      code = 'AUTH_REQUIRED';
      userMessage = 'ログインが必要です。';
      break;
    case 403:
      category = ErrorCategory.AUTHORIZATION;
      severity = ErrorSeverity.HIGH;
      code = 'AUTH_FORBIDDEN';
      userMessage = 'この操作を行う権限がありません。';
      break;
    case 404:
      category = ErrorCategory.NOT_FOUND;
      severity = ErrorSeverity.MEDIUM;
      code = 'NOT_FOUND';
      userMessage = '要求されたリソースが見つかりません。';
      break;
    case 429:
      category = ErrorCategory.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
      code = 'RATE_LIMIT';
      userMessage = 'リクエストが多すぎます。しばらく待ってから再度お試しください。';
      break;
    default:
      category = ErrorCategory.SERVER;
      severity = ErrorSeverity.CRITICAL;
      code = 'SERVER_ERROR';
      userMessage = 'サーバーエラーが発生しました。';
  }

  const standardError = new StandardError({
    category,
    severity,
    code,
    message: exception.message,
    userMessage,
    retryable: exception.status >= 500,
  });

  addContextToError(standardError, c);
  return standardError;
}

/**
 * エラーにリクエストコンテキスト情報を追加
 */
function addContextToError(error: StandardError, c: Context): void {
  // コンテキスト情報を動的に追加
  (error as any).context = {
    ...error.context,
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('User-Agent'),
    timestamp: new Date().toISOString(),
  };

  // 認証ユーザー情報を追加（利用可能な場合）
  try {
    const authUser = c.get('authUser');
    if (authUser?.userId) {
      (error as any).context.userId = authUser.userId.toString();
    }
  } catch {
    // 認証情報がない場合は無視
  }
}

/**
 * カスタムエラーレスポンス作成ヘルパー
 */
export const createErrorResponse = {
  validation: (message: string, details?: Record<string, any>) => {
    const error = createStandardError.validation(message, details);
    return Response.json(error.toResponse(), { status: 400 });
  },

  authentication: (message?: string) => {
    const error = createStandardError.authentication(message);
    return Response.json(error.toResponse(), { status: 401 });
  },

  unauthorized: (message?: string) => {
    const error = createStandardError.unauthorized(message);
    return Response.json(error.toResponse(), { status: 403 });
  },

  notFound: (resource?: string) => {
    const error = createStandardError.notFound(resource);
    return Response.json(error.toResponse(), { status: 404 });
  },

  server: (message?: string) => {
    const error = createStandardError.server(message);
    return Response.json(error.toResponse(), { status: 500 });
  },
};