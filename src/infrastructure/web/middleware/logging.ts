/*  */ /**
 * ログミドルウェア - 全てのHTTPリクエストを監視・記録
 */

import { Context, Next } from 'hono';
import { logger, generateRequestId, getUserIdFromContext, getClientIp } from '../../../utils/logger.js';

/**
 * リクエスト・レスポンスロギングミドルウェア
 */
export const loggingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const method = c.req.method;
  const path = c.req.path;
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = getClientIp(c);
  const userId = getUserIdFromContext(c);

  // リクエストIDをコンテキストに保存
  c.set('requestId', requestId);
  c.set('startTime', startTime);

  // リクエスト開始ログ
  logger.logRequest({
    requestId,
    method,
    path,
    userAgent,
    ip,
    userId,
  });

  try {
    await next();
  } catch (error) {
    const duration = Date.now() - startTime;

    // エラーログ
    logger.logError('Request failed with unhandled error', {
      requestId,
      method,
      path,
      userId,
      error: error as Error,
    });

    // レスポンスログ（エラー）
    logger.logResponse({
      requestId,
      method,
      path,
      statusCode: 500,
      duration,
      userId,
    });

    throw error;
  }

  const duration = Date.now() - startTime;
  const statusCode = c.res.status;

  // レスポンスログ
  logger.logResponse({
    requestId,
    method,
    path,
    statusCode,
    duration,
    userId,
  });
};

/**
 * エラーハンドリングミドルウェア
 */
export const errorLoggingMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    const requestId = c.get('requestId') || 'unknown';
    const method = c.req.method;
    const path = c.req.path;
    const userId = getUserIdFromContext(c);

    logger.logError('Middleware caught error', {
      requestId,
      method,
      path,
      userId,
      error: error as Error,
    });

    // 標準化されたエラーレスポンス
    const errorResponse = {
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (error as Error).message,
      requestId,
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
};

/**
 * データベース操作ロギング用のヘルパー
 */
export const logDatabaseOperation = async <T>(operation: string, table: string, fn: () => Promise<T>): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.logDatabase(operation, table, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.logDatabase(operation, table, duration, error as Error);
    throw error;
  }
};

/**
 * ビジネスロジックログ用のヘルパー
 */
export const logBusinessEvent = (event: string, metadata?: Record<string, any>) => {
  logger.logBusinessEvent(event, metadata);
};

/**
 * セキュリティイベントログ用のヘルパー
 */
export const logSecurityEvent = (
  c: Context,
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>,
) => {
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent');
  const userId = getUserIdFromContext(c);

  logger.logSecurity(event, {
    ip,
    userAgent,
    userId,
    severity,
    metadata,
  });
};

export default {
  loggingMiddleware,
  errorLoggingMiddleware,
  logDatabaseOperation,
  logBusinessEvent,
  logSecurityEvent,
};
