import { vi, MockedFunction } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { IQuestionRepository } from '../../domain/repositories/IQuestionRepository';

/**
 * Vitest用の型定義
 */
type MockedPrisma = {
  question: {
    findUnique: MockedFunction<any>;
    findMany: MockedFunction<any>;
    count: MockedFunction<any>;
    groupBy: MockedFunction<any>;
    create: MockedFunction<any>;
    update: MockedFunction<any>;
    delete: MockedFunction<any>;
    findFirst: MockedFunction<any>;
    createMany: MockedFunction<any>;
    updateMany: MockedFunction<any>;
    deleteMany: MockedFunction<any>;
    upsert: MockedFunction<any>;
    aggregate: MockedFunction<any>;
  };
  userAnswer: {
    findUnique: MockedFunction<any>;
    findMany: MockedFunction<any>;
    count: MockedFunction<any>;
    create: MockedFunction<any>;
    update: MockedFunction<any>;
    delete: MockedFunction<any>;
    findFirst: MockedFunction<any>;
    createMany: MockedFunction<any>;
    updateMany: MockedFunction<any>;
    deleteMany: MockedFunction<any>;
    upsert: MockedFunction<any>;
  };
  quizSession: {
    findUnique: MockedFunction<any>;
    findMany: MockedFunction<any>;
    count: MockedFunction<any>;
    create: MockedFunction<any>;
    update: MockedFunction<any>;
    delete: MockedFunction<any>;
    findFirst: MockedFunction<any>;
    createMany: MockedFunction<any>;
    updateMany: MockedFunction<any>;
    deleteMany: MockedFunction<any>;
    upsert: MockedFunction<any>;
  };
  $queryRaw: MockedFunction<any>;
  $executeRaw: MockedFunction<any>;
  $transaction: MockedFunction<any>;
  $connect: MockedFunction<any>;
  $disconnect: MockedFunction<any>;
};

type MockedQuestionRepository = {
  findById: MockedFunction<any>;
  findMany: MockedFunction<any>;
  findByCategory: MockedFunction<any>;
  findRandom: MockedFunction<any>;
  checkAnswer: MockedFunction<any>;
  getQuestionWithChoices: MockedFunction<any>;
  countQuestions: MockedFunction<any>;
};

/**
 * PrismaClientのモックを作成
 */
export const createMockPrismaClient = (): MockedPrisma => {
  return {
    question: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      aggregate: vi.fn(),
    },
    userAnswer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    quizSession: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
};

/**
 * QuestionRepositoryのモックを作成
 */
export const createMockQuestionRepository = (): MockedQuestionRepository => {
  return {
    findById: vi.fn(),
    findMany: vi.fn(),
    findByCategory: vi.fn(),
    findRandom: vi.fn(),
    checkAnswer: vi.fn(),
    getQuestionWithChoices: vi.fn(),
    countQuestions: vi.fn(),
  };
};

/**
 * モック関数の戻り値を設定するヘルパー
 */
export const MockHelpers = {
  /**
   * findUniqueの戻り値を設定
   */
  setupFindUnique: (mockPrisma: MockedPrisma, returnValue: unknown) => {
    mockPrisma.question.findUnique.mockResolvedValue(returnValue);
  },

  /**
   * findManyの戻り値を設定
   */
  setupFindMany: (mockPrisma: MockedPrisma, returnValue: unknown) => {
    mockPrisma.question.findMany.mockResolvedValue(returnValue);
  },

  /**
   * countの戻り値を設定
   */
  setupCount: (mockPrisma: MockedPrisma, returnValue: number) => {
    mockPrisma.question.count.mockResolvedValue(returnValue);
  },

  /**
   * $queryRawの戻り値を設定
   */
  setupQueryRaw: (mockPrisma: MockedPrisma, returnValue: unknown) => {
    mockPrisma.$queryRaw.mockResolvedValue(returnValue);
  },

  /**
   * QuestionRepositoryのメソッドの戻り値を設定
   */
  setupQuestionRepository: {
    findById: (mockRepo: MockedQuestionRepository, returnValue: unknown) => {
      mockRepo.findById.mockResolvedValue(returnValue);
    },

    findMany: (mockRepo: MockedQuestionRepository, returnValue: unknown) => {
      mockRepo.findMany.mockResolvedValue(returnValue);
    },

    findByCategory: (mockRepo: MockedQuestionRepository, returnValue: unknown) => {
      mockRepo.findByCategory.mockResolvedValue(returnValue);
    },

    findRandom: (mockRepo: MockedQuestionRepository, returnValue: unknown) => {
      mockRepo.findRandom.mockResolvedValue(returnValue);
    },

    checkAnswer: (mockRepo: MockedQuestionRepository, returnValue: unknown) => {
      mockRepo.checkAnswer.mockResolvedValue(returnValue);
    },

    countQuestions: (mockRepo: MockedQuestionRepository, returnValue: number) => {
      mockRepo.countQuestions.mockResolvedValue(returnValue);
    },

    throwError: (mockRepo: MockedQuestionRepository, method: keyof MockedQuestionRepository, error: Error) => {
      mockRepo[method].mockRejectedValue(error);
    },
  },

  /**
   * エラーケースのセットアップ
   */
  setupError: (mockFn: MockedFunction<any>, error: Error) => {
    mockFn.mockRejectedValue(error);
  },

  /**
   * すべてのモックをリセット
   */
  resetAllMocks: (mocks: Record<string, MockedFunction<any>>) => {
    Object.values(mocks).forEach(mock => {
      if (mock && typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
    });
  },
};

/**
 * テスト用のエラー定数
 */
export const TEST_ERRORS = {
  DATABASE_CONNECTION_FAILED: new Error('Database connection failed'),
  QUERY_TIMEOUT: new Error('Query timeout'),
  RANDOM_QUERY_FAILED: new Error('Random query failed'),
  COUNT_QUERY_FAILED: new Error('Count query failed'),
  QUESTION_NOT_FOUND: (id: string) => new Error(`Question not found: ${id}`),
  VALIDATION_ERROR: new Error('Validation failed'),
} as const;