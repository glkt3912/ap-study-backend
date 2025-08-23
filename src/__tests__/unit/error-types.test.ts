import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorCategory,
  ErrorSeverity,
  StandardError,
  createStandardError,
  type StandardErrorResponse,
  type StandardSuccessResponse,
} from '../../utils/error-types';

describe('Error Types', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-08-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ErrorCategory enum', () => {
    it('should have all expected categories', () => {
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.API).toBe('api');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
      expect(ErrorCategory.AUTHORIZATION).toBe('authorization');
      expect(ErrorCategory.NOT_FOUND).toBe('not_found');
      expect(ErrorCategory.RATE_LIMIT).toBe('rate_limit');
      expect(ErrorCategory.SERVER).toBe('server');
      expect(ErrorCategory.CLIENT).toBe('client');
      expect(ErrorCategory.UNKNOWN).toBe('unknown');
    });
  });

  describe('ErrorSeverity enum', () => {
    it('should have all expected severities', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('StandardError class', () => {
    it('should create a StandardError with required fields', () => {
      const error = new StandardError({
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: 'TEST_ERROR',
        message: 'Test error message',
        userMessage: 'User-friendly message',
      });

      expect(error.name).toBe('StandardError');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.userMessage).toBe('User-friendly message');
      expect(error.timestamp).toBe('2024-08-10T12:00:00.000Z');
      expect(error.retryable).toBe(false);
      expect(error.id).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    it('should create a StandardError with optional fields', () => {
      const error = new StandardError({
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.HIGH,
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        userMessage: 'Something went wrong',
        retryable: true,
        details: { endpoint: '/api/test' },
        context: {
          url: '/api/test',
          method: 'POST',
          userId: '123',
          requestId: 'req-456',
        },
      });

      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ endpoint: '/api/test' });
      expect(error.context).toEqual({
        url: '/api/test',
        method: 'POST',
        userId: '123',
        requestId: 'req-456',
      });
    });

    it('should generate unique error IDs', () => {
      const error1 = new StandardError({
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: 'TEST_ERROR',
        message: 'Test error message',
        userMessage: 'User-friendly message',
      });

      vi.advanceTimersByTime(1);

      const error2 = new StandardError({
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: 'TEST_ERROR',
        message: 'Test error message',
        userMessage: 'User-friendly message',
      });

      expect(error1.id).not.toBe(error2.id);
    });

    it('should convert to JSON correctly', () => {
      const error = new StandardError({
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        userMessage: 'Please login again',
        retryable: false,
        details: { reason: 'token_expired' },
        context: { url: '/api/protected' },
      });

      const json = error.toJSON();

      expect(json).toEqual({
        id: error.id,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        userMessage: 'Please login again',
        timestamp: '2024-08-10T12:00:00.000Z',
        retryable: false,
        details: { reason: 'token_expired' },
        context: { url: '/api/protected' },
      });
    });

    it('should convert to response correctly', () => {
      const error = new StandardError({
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
        userMessage: 'The requested resource was not found',
      });

      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error).toEqual(error.toJSON());
      expect(response.metadata).toEqual({
        version: 'unified-api-v1.0',
        timestamp: '2024-08-10T12:00:00.000Z',
      });
    });
  });

  describe('createStandardError factory functions', () => {
    describe('validation', () => {
      it('should create a validation error', () => {
        const error = createStandardError.validation('Invalid input');

        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Invalid input');
        expect(error.userMessage).toBe('入力内容に問題があります。エラーメッセージを確認してください。');
        expect(error.retryable).toBe(false);
      });

      it('should create a validation error with details', () => {
        const details = { field: 'email', reason: 'invalid_format' };
        const error = createStandardError.validation('Invalid email format', details);

        expect(error.details).toEqual(details);
      });
    });

    describe('authentication', () => {
      it('should create an authentication error with default message', () => {
        const error = createStandardError.authentication();

        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.code).toBe('AUTH_REQUIRED');
        expect(error.message).toBe('Authentication required');
        expect(error.userMessage).toBe('ログインが必要です。再度ログインしてください。');
        expect(error.retryable).toBe(false);
      });

      it('should create an authentication error with custom message', () => {
        const error = createStandardError.authentication('Token expired');

        expect(error.message).toBe('Token expired');
      });
    });

    describe('unauthorized', () => {
      it('should create an unauthorized error with default message', () => {
        const error = createStandardError.unauthorized();

        expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.code).toBe('AUTH_UNAUTHORIZED');
        expect(error.message).toBe('Unauthorized access');
        expect(error.userMessage).toBe('この操作を行う権限がありません。');
        expect(error.retryable).toBe(false);
      });

      it('should create an unauthorized error with custom message', () => {
        const error = createStandardError.unauthorized('Insufficient permissions');

        expect(error.message).toBe('Insufficient permissions');
      });
    });

    describe('notFound', () => {
      it('should create a not found error with default resource', () => {
        const error = createStandardError.notFound();

        expect(error.category).toBe(ErrorCategory.NOT_FOUND);
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('リソース not found');
        expect(error.userMessage).toBe('リソースが見つかりません。');
        expect(error.retryable).toBe(false);
      });

      it('should create a not found error with custom resource', () => {
        const error = createStandardError.notFound('User');

        expect(error.message).toBe('User not found');
        expect(error.userMessage).toBe('Userが見つかりません。');
      });
    });

    describe('server', () => {
      it('should create a server error with default values', () => {
        const error = createStandardError.server();

        expect(error.category).toBe(ErrorCategory.SERVER);
        expect(error.severity).toBe(ErrorSeverity.CRITICAL);
        expect(error.code).toBe('SERVER_ERROR');
        expect(error.message).toBe('Internal server error');
        expect(error.userMessage).toBe('サーバーで問題が発生しました。しばらく待ってから再度お試しください。');
        expect(error.retryable).toBe(true);
      });

      it('should create a server error with custom message and retryable false', () => {
        const error = createStandardError.server('Database connection failed', false);

        expect(error.message).toBe('Database connection failed');
        expect(error.retryable).toBe(false);
      });
    });

    describe('database', () => {
      it('should create a database error with default values', () => {
        const error = createStandardError.database();

        expect(error.category).toBe(ErrorCategory.SERVER);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.code).toBe('DATABASE_ERROR');
        expect(error.message).toBe('Database error');
        expect(error.userMessage).toBe('データベースエラーが発生しました。しばらく待ってから再度お試しください。');
        expect(error.retryable).toBe(true);
      });

      it('should create a database error with custom message and retryable false', () => {
        const error = createStandardError.database('Query timeout', false);

        expect(error.message).toBe('Query timeout');
        expect(error.retryable).toBe(false);
      });
    });
  });

  describe('Type definitions', () => {
    it('should define StandardErrorResponse correctly', () => {
      const response: StandardErrorResponse = {
        success: false,
        error: {
          id: 'test-id',
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          code: 'TEST_ERROR',
          message: 'Test message',
          userMessage: 'User message',
          timestamp: '2024-08-10T12:00:00.000Z',
          retryable: false,
        },
        metadata: {
          version: 'unified-api-v1.0',
          timestamp: '2024-08-10T12:00:00.000Z',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should define StandardSuccessResponse correctly', () => {
      const response: StandardSuccessResponse<{ message: string }> = {
        success: true,
        data: { message: 'Success' },
        metadata: {
          version: 'unified-api-v1.0',
          timestamp: '2024-08-10T12:00:00.000Z',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.message).toBe('Success');
    });
  });
});