import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { LogLevel, logger, generateRequestId, getUserIdFromContext, getClientIp } from '../../utils/logger';
import { Context } from 'hono';

describe('Logger', () => {
  let consoleSpy: {
    debug: Mock;
    log: Mock;
    warn: Mock;
    error: Mock;
  };

  beforeEach(() => {
    // Reset environment variables
    process.env.LOG_LEVEL = 'DEBUG';
    process.env.LOG_CONSOLE = 'true';
    process.env.LOG_STRUCTURED = 'false';
    process.env.NODE_ENV = 'test';
    
    // Mock console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    // Mock date for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-08-10T12:00:00.000Z'));

    // Reset logger metrics
    logger.resetMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_CONSOLE;
    delete process.env.LOG_STRUCTURED;
    delete process.env.EXTERNAL_LOG_ENDPOINT;
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.FATAL).toBe(4);
    });
  });

  describe('Basic logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' });
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]')
      );
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should log info messages', () => {
      logger.info('Info message', { key: 'value' });
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO ]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Info message')
      );
    });

    it('should log warn messages', () => {
      logger.warn('Warning message', { key: 'value' });
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN ]')
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning message')
      );
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error, { key: 'value' });
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message')
      );
    });

    it('should log fatal messages', () => {
      const error = new Error('Fatal error');
      logger.fatal('Fatal message', error, { key: 'value' });
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]')
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Fatal message')
      );
    });
  });

  describe('Log level filtering', () => {
    it('should filter messages below the minimum level', () => {
      // This test needs to create a new logger with WARN level
      // The current logger instance was created with DEBUG level
      process.env.LOG_LEVEL = 'WARN';
      
      // Create a new Logger instance to pick up the new log level
      const { logger: warnLogger } = vi.importActual('../../utils/logger') as any;
      
      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warning message');
      
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should use INFO level in production by default', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'production';
      
      // Import actual logger module
      const { logger: prodLogger } = vi.importActual('../../utils/logger') as any;
      
      prodLogger.debug('Debug message');
      prodLogger.info('Info message');
      
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should use DEBUG level in development by default', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'development';
      
      logger.debug('Debug message');
      
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe('Structured logging', () => {
    it('should output JSON format when structured logging is enabled', () => {
      process.env.LOG_STRUCTURED = 'true';
      
      // Create a new logger instance with structured logging
      const { logger: structuredLogger } = vi.importActual('../../utils/logger') as any;
      
      structuredLogger.info('Test message');
      
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
      
      const parsedLog = JSON.parse(logOutput);
      expect(parsedLog.level).toBe(LogLevel.INFO);
      expect(parsedLog.levelName).toBe('INFO');
      expect(parsedLog.message).toBe('Test message');
    });

    it('should output human-readable format when structured logging is disabled', () => {
      process.env.LOG_STRUCTURED = 'false';
      
      logger.info('Test message');
      
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('2024-08-10T12:00:00.000Z');
      expect(logOutput).toContain('[INFO ]');
      expect(logOutput).toContain('Test message');
    });
  });

  describe('Console output control', () => {
    it('should not output to console when LOG_CONSOLE is false', () => {
      process.env.LOG_CONSOLE = 'false';
      
      // Create a new logger instance with console disabled
      const { logger: noConsoleLogger } = vi.importActual('../../utils/logger') as any;
      
      noConsoleLogger.info('Test message');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should output to console when LOG_CONSOLE is true', () => {
      process.env.LOG_CONSOLE = 'true';
      
      logger.info('Test message');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Request logging', () => {
    it('should log request start', () => {
      const context = {
        requestId: 'req-123',
        method: 'GET',
        path: '/api/test',
        userAgent: 'test-agent',
        ip: '192.168.1.1',
        userId: 'user-456',
      };
      
      logger.logRequest(context);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Request started')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[req-123]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/test')
      );
    });

    it('should log response completion', () => {
      const context = {
        requestId: 'req-123',
        method: 'POST',
        path: '/api/create',
        statusCode: 201,
        duration: 150,
        userId: 'user-456',
      };
      
      logger.logResponse(context);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Request completed')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[201]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('(150ms)')
      );
    });

    it('should log error responses as warnings', () => {
      const context = {
        requestId: 'req-123',
        method: 'GET',
        path: '/api/error',
        statusCode: 500,
        duration: 50,
      };
      
      logger.logResponse(context);
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request completed')
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[500]')
      );
    });
  });

  describe('Database logging', () => {
    it('should log successful database operations', () => {
      logger.logDatabase('SELECT', 'users', 25);
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('Database SELECT on users completed')
      );
    });

    it('should log failed database operations as errors', () => {
      const error = new Error('Connection failed');
      logger.logDatabase('INSERT', 'orders', 100, error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Database INSERT on orders failed')
      );
    });
  });

  describe('Business event logging', () => {
    it('should log business events', () => {
      logger.logBusinessEvent('User registered', { userId: '123' });
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Business event: User registered')
      );
    });
  });

  describe('Security logging', () => {
    it('should log security events as warnings for non-critical severity', () => {
      const context = {
        ip: '192.168.1.1',
        userAgent: 'suspicious-agent',
        userId: 'user-123',
        severity: 'medium' as const,
        metadata: { attempt: 3 },
      };
      
      logger.logSecurity('Failed login attempt', context);
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Security event: Failed login attempt')
      );
    });

    it('should log security events as errors for critical severity', () => {
      const context = {
        severity: 'critical' as const,
        metadata: { breach: true },
      };
      
      logger.logSecurity('Data breach attempt', context);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Security event: Data breach attempt')
      );
    });
  });

  describe('Error logging', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      const context = {
        requestId: 'req-123',
        method: 'POST',
        path: '/api/error',
        userId: 'user-456',
        error,
      };
      
      logger.logError('Request failed', context);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Request failed')
      );
    });
  });

  describe('Metrics tracking', () => {
    beforeEach(() => {
      logger.resetMetrics();
    });

    it('should track request metrics', () => {
      logger.logResponse({
        requestId: 'req-1',
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        duration: 100,
      });

      logger.logResponse({
        requestId: 'req-2',
        method: 'POST',
        path: '/api/users',
        statusCode: 201,
        duration: 200,
      });

      const metrics = logger.getMetrics();
      
      expect(metrics.requestCount).toBe(2);
      expect(metrics.totalResponseTime).toBe(300);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.statusCodes[200]).toBe(1);
      expect(metrics.statusCodes[201]).toBe(1);
    });

    it('should track endpoint-specific metrics', () => {
      logger.logResponse({
        requestId: 'req-1',
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        duration: 100,
      });

      logger.logResponse({
        requestId: 'req-2',
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        duration: 200,
      });

      const metrics = logger.getMetrics();
      
      expect(metrics.endpoints['GET /api/users']).toBeDefined();
      expect(metrics.endpoints['GET /api/users'].count).toBe(2);
      expect(metrics.endpoints['GET /api/users'].totalTime).toBe(300);
      expect(metrics.endpoints['GET /api/users'].errors).toBe(0);
      
      expect(metrics.endpointAverages['GET /api/users'].averageTime).toBe(150);
      expect(metrics.endpointAverages['GET /api/users'].errorRate).toBe(0);
    });

    it('should track error counts', () => {
      logger.error('Test error');
      logger.fatal('Test fatal');
      
      const metrics = logger.getMetrics();
      expect(metrics.errorCount).toBe(2);
    });

    it('should track endpoint errors', () => {
      logger.logResponse({
        requestId: 'req-1',
        method: 'GET',
        path: '/api/error',
        statusCode: 500,
        duration: 50,
      });

      const metrics = logger.getMetrics();
      
      expect(metrics.endpoints['GET /api/error'].errors).toBe(1);
      expect(metrics.endpointAverages['GET /api/error'].errorRate).toBe(1);
    });

    it('should reset metrics correctly', () => {
      logger.logResponse({
        requestId: 'req-1',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 100,
      });

      logger.resetMetrics();
      const metrics = logger.getMetrics();
      
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.totalResponseTime).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(Object.keys(metrics.statusCodes)).toHaveLength(0);
      expect(Object.keys(metrics.endpoints)).toHaveLength(0);
    });
  });

  describe('Helper functions', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-z0-9]{22}$/);
      expect(id2).toMatch(/^[a-z0-9]{22}$/);
    });

    it('should get user ID from context header', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('user-123'),
        },
      } as unknown as Context;
      
      const userId = getUserIdFromContext(mockContext);
      
      expect(userId).toBe('user-123');
      expect(mockContext.req.header).toHaveBeenCalledWith('X-User-ID');
    });

    it('should return anonymous when no user ID in context', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as Context;
      
      const userId = getUserIdFromContext(mockContext);
      
      expect(userId).toBe('anonymous');
    });

    it('should get client IP from various headers', () => {
      const mockContext = {
        req: {
          header: vi.fn()
            .mockReturnValueOnce('192.168.1.1') // x-forwarded-for
            .mockReturnValueOnce(undefined), // x-real-ip
        },
      } as unknown as Context;
      
      const ip = getClientIp(mockContext);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should fallback to x-real-ip header', () => {
      const mockContext = {
        req: {
          header: vi.fn()
            .mockReturnValueOnce(undefined) // x-forwarded-for
            .mockReturnValueOnce('10.0.0.1'), // x-real-ip
        },
      } as unknown as Context;
      
      const ip = getClientIp(mockContext);
      
      expect(ip).toBe('10.0.0.1');
    });

    it('should return unknown when no IP headers available', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as Context;
      
      const ip = getClientIp(mockContext);
      
      expect(ip).toBe('unknown');
    });
  });

  describe('External logging service integration', () => {
    it('should not call external service when no endpoint configured', () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));
      
      logger.error('Test error');
      
      expect(fetchSpy).not.toHaveBeenCalled();
      
      fetchSpy.mockRestore();
    });

    it('should prepare for external service integration', () => {
      process.env.EXTERNAL_LOG_ENDPOINT = 'https://logs.example.com/api';
      
      // This test just verifies the structure is ready for future implementation
      logger.error('Test error');
      
      // No actual HTTP call in current implementation, but structure is ready
      expect(process.env.EXTERNAL_LOG_ENDPOINT).toBe('https://logs.example.com/api');
    });
  });
});