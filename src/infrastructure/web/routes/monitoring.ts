/**
 * 監視・ログ管理API エンドポイント
 */

import { Hono } from 'hono';
import { logger } from '../../../utils/logger.js';
import { logBusinessEvent, logSecurityEvent } from '../middleware/logging.js';

const monitoring = new Hono();

/**
 * フロントエンドからの監視イベント受信
 */
monitoring.post('/events', async (c) => {
  try {
    const body = await c.req.json();
    const { events, metadata } = body;

    if (!Array.isArray(events)) {
      return c.json({
        success: false,
        error: 'Events must be an array'
      }, 400);
    }

    // 各イベントを処理
    for (const event of events) {
      const { type, data, timestamp } = event;

      switch (type) {
        case 'error':
          logger.error('Frontend error reported', new Error(data.message), {
            frontend: true,
            filename: data.filename,
            lineno: data.lineno,
            colno: data.colno,
            stack: data.stack,
            userAgent: data.userAgent,
            url: data.url,
            userId: data.userId,
            timestamp: data.timestamp,
          });
          break;

        case 'performance':
          logger.info('Frontend performance metric', {
            frontend: true,
            metricType: data.type,
            name: data.name,
            duration: data.duration,
            url: data.url,
            userId: data.userId,
            metadata: data.metadata,
            timestamp: data.timestamp,
          });
          break;

        case 'user-event':
          logger.debug('Frontend user event', {
            frontend: true,
            eventType: data.type,
            target: data.target,
            url: data.url,
            userId: data.userId,
            metadata: data.metadata,
            timestamp: data.timestamp,
          });
          break;

        default:
          logger.warn('Unknown frontend event type', {
            frontend: true,
            type,
            data,
            timestamp,
          });
      }
    }

    logBusinessEvent('Frontend monitoring events processed', {
      eventCount: events.length,
      metadata,
    });

    return c.json({
      success: true,
      processed: events.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Failed to process monitoring events', error as Error);
    
    return c.json({
      success: false,
      error: 'Failed to process events',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

/**
 * サーバーメトリクス取得
 */
monitoring.get('/metrics', async (c) => {
  try {
    const metrics = logger.getMetrics();
    
    logBusinessEvent('Server metrics requested', {
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      averageResponseTime: metrics.averageResponseTime,
    });

    return c.json({
      success: true,
      data: {
        ...metrics,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    });

  } catch (error) {
    logger.error('Failed to get server metrics', error as Error);
    
    return c.json({
      success: false,
      error: 'Failed to get metrics',
    }, 500);
  }
});

/**
 * メトリクスリセット（開発環境のみ）
 */
monitoring.post('/metrics/reset', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    logSecurityEvent(c, 'Attempted to reset metrics in production', 'medium');
    
    return c.json({
      success: false,
      error: 'Not allowed in production',
    }, 403);
  }

  try {
    logger.resetMetrics();
    
    logBusinessEvent('Server metrics reset', {
      environment: process.env.NODE_ENV,
    });

    return c.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Failed to reset metrics', error as Error);
    
    return c.json({
      success: false,
      error: 'Failed to reset metrics',
    }, 500);
  }
});

/**
 * ヘルスチェックエンドポイント
 */
monitoring.get('/health', async (c) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
    },
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  };

  return c.json({
    success: true,
    data: healthData,
  });
});

/**
 * ログレベル動的変更（開発環境のみ）
 */
monitoring.post('/log-level', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    logSecurityEvent(c, 'Attempted to change log level in production', 'medium');
    
    return c.json({
      success: false,
      error: 'Not allowed in production',
    }, 403);
  }

  try {
    const { level } = await c.req.json();
    
    if (!['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(level)) {
      return c.json({
        success: false,
        error: 'Invalid log level',
      }, 400);
    }

    // 環境変数を動的に変更（開発環境のみ）
    process.env.LOG_LEVEL = level;
    
    logBusinessEvent('Log level changed', {
      newLevel: level,
      environment: process.env.NODE_ENV,
    });

    return c.json({
      success: true,
      message: `Log level changed to ${level}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Failed to change log level', error as Error);
    
    return c.json({
      success: false,
      error: 'Failed to change log level',
    }, 500);
  }
});

/**
 * システム情報取得
 */
monitoring.get('/system', async (c) => {
  try {
    const systemInfo = {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: systemInfo,
    });

  } catch (error) {
    logger.error('Failed to get system info', error as Error);
    
    return c.json({
      success: false,
      error: 'Failed to get system info',
    }, 500);
  }
});

export default monitoring;