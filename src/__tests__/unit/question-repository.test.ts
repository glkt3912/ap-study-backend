import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuestionRepository } from '../../infrastructure/database/repositories/QuestionRepository';
import { QuestionFilters, QuestionQueryOptions } from '../../domain/repositories/IQuestionRepository';
import { QuestionFixtures, TEST_CONSTANTS } from '../fixtures/question-fixtures';
import { createMockPrismaClient, MockHelpers, TEST_ERRORS } from '../helpers/mock-factories';

describe('QuestionRepository', () => {
  let questionRepository: QuestionRepository;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    questionRepository = new QuestionRepository(mockPrisma as any);
  });

  afterEach(() => {
    MockHelpers.resetAllMocks(mockPrisma as any);
  });

  describe('findById', () => {
    it('should find question by id', async () => {
      const mockQuestion = QuestionFixtures.createBasicQuestion();
      MockHelpers.setupFindUnique(mockPrisma, mockQuestion);

      const result = await questionRepository.findById(TEST_CONSTANTS.QUESTION_IDS.VALID);

      expect(result).toEqual(mockQuestion);
      expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_CONSTANTS.QUESTION_IDS.VALID }
      });
    });

    it('should return null when question not found', async () => {
      MockHelpers.setupFindUnique(mockPrisma, null);

      const result = await questionRepository.findById(TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT);

      expect(result).toBeNull();
      expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT }
      });
    });
  });

  describe('findMany', () => {
    const mockQuestions = QuestionFixtures.createMultipleQuestions(2);

    it('should find questions with filters and options', async () => {
      MockHelpers.setupFindMany(mockPrisma, mockQuestions);

      const filters: QuestionFilters = { 
        category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY, 
        year: TEST_CONSTANTS.YEARS.RECENT 
      };
      const options: QuestionQueryOptions = { limit: 10 };

      const result = await questionRepository.findMany(filters, options);

      expect(result).toEqual(mockQuestions);
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: { 
          category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY, 
          year: TEST_CONSTANTS.YEARS.RECENT 
        },
        take: 10,
        skip: undefined,
        orderBy: [
          { year: 'desc' },
          { season: 'desc' },
          { section: 'asc' },
          { number: 'asc' }
        ]
      });
    });

    it('should handle empty filters and options', async () => {
      MockHelpers.setupFindMany(mockPrisma, mockQuestions);

      const result = await questionRepository.findMany();

      expect(result).toEqual(mockQuestions);
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: {},
        take: undefined,
        skip: undefined,
        orderBy: [
          { year: 'desc' },
          { season: 'desc' },
          { section: 'asc' },
          { number: 'asc' }
        ]
      });
    });
  });

  describe('findRandom', () => {
    it('should find random questions using $queryRaw', async () => {
      const mockQuestions = QuestionFixtures.createMultipleQuestions(2);
      MockHelpers.setupQueryRaw(mockPrisma, mockQuestions);

      const filters: QuestionFilters = { category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY };
      const result = await questionRepository.findRandom(2, filters);

      expect(result).toEqual(mockQuestions);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle empty filters', async () => {
      const mockQuestions = QuestionFixtures.createMultipleQuestions(5);
      MockHelpers.setupQueryRaw(mockPrisma, mockQuestions);

      const result = await questionRepository.findRandom(5);

      expect(result).toEqual(mockQuestions);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('checkAnswer', () => {
    it('should return correct result when answer is correct', async () => {
      const mockQuestion = QuestionFixtures.createBasicQuestion();
      MockHelpers.setupFindUnique(mockPrisma, mockQuestion);

      const result = await questionRepository.checkAnswer(
        TEST_CONSTANTS.QUESTION_IDS.VALID, 
        TEST_CONSTANTS.ANSWERS.CORRECT
      );

      expect(result).toEqual(QuestionFixtures.createAnswerCheckResult());
      expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_CONSTANTS.QUESTION_IDS.VALID }
      });
    });

    it('should return incorrect result when answer is wrong', async () => {
      const mockQuestion = QuestionFixtures.createBasicQuestion();
      MockHelpers.setupFindUnique(mockPrisma, mockQuestion);

      const result = await questionRepository.checkAnswer(
        TEST_CONSTANTS.QUESTION_IDS.VALID, 
        TEST_CONSTANTS.ANSWERS.INCORRECT
      );

      expect(result).toEqual(QuestionFixtures.createIncorrectAnswerResult());
    });

    it('should handle case insensitive comparison', async () => {
      const mockQuestion = QuestionFixtures.createBasicQuestion({ answer: 'b' });
      MockHelpers.setupFindUnique(mockPrisma, mockQuestion);

      const result = await questionRepository.checkAnswer(
        TEST_CONSTANTS.QUESTION_IDS.VALID, 
        TEST_CONSTANTS.ANSWERS.CORRECT
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should throw error when question not found', async () => {
      MockHelpers.setupFindUnique(mockPrisma, null);

      await expect(
        questionRepository.checkAnswer(TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT, 'A')
      ).rejects.toThrow(`Question not found: ${TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT}`);
    });

    it('should handle missing explanation', async () => {
      const mockQuestion = QuestionFixtures.createBasicQuestion({ explanation: null });
      MockHelpers.setupFindUnique(mockPrisma, mockQuestion);

      const result = await questionRepository.checkAnswer(
        TEST_CONSTANTS.QUESTION_IDS.VALID, 
        TEST_CONSTANTS.ANSWERS.CORRECT
      );

      expect(result.explanation).toBeUndefined();
    });
  });

  describe('countQuestions', () => {
    it('should count questions with filters', async () => {
      const expectedCount = 100;
      MockHelpers.setupCount(mockPrisma, expectedCount);

      const filters: QuestionFilters = { 
        category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY, 
        year: TEST_CONSTANTS.YEARS.RECENT 
      };
      const result = await questionRepository.countQuestions(filters);

      expect(result).toBe(expectedCount);
      expect(mockPrisma.question.count).toHaveBeenCalledWith({
        where: { 
          category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY, 
          year: TEST_CONSTANTS.YEARS.RECENT 
        }
      });
    });

    it('should count all questions when no filters', async () => {
      const expectedCount = 500;
      MockHelpers.setupCount(mockPrisma, expectedCount);

      const result = await questionRepository.countQuestions();

      expect(result).toBe(expectedCount);
      expect(mockPrisma.question.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('error handling', () => {
    it('should propagate database errors', async () => {
      MockHelpers.setupError(mockPrisma.question.findUnique, TEST_ERRORS.DATABASE_CONNECTION_FAILED);

      await expect(
        questionRepository.findById(TEST_CONSTANTS.QUESTION_IDS.VALID)
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate query timeout errors', async () => {
      MockHelpers.setupError(mockPrisma.question.findMany, TEST_ERRORS.QUERY_TIMEOUT);

      await expect(
        questionRepository.findMany()
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('buildWhereClause (private method testing)', () => {
    it('should build proper where clause with all filters', () => {
      const filters: QuestionFilters = {
        year: TEST_CONSTANTS.YEARS.RECENT,
        season: TEST_CONSTANTS.SEASONS.SPRING,
        section: TEST_CONSTANTS.SECTIONS.MORNING,
        category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY,
        subcategory: '論理回路',
        difficulty: TEST_CONSTANTS.DIFFICULTIES.NORMAL
      };

      // Access private method through type assertion for testing
      const whereClause = (questionRepository as any).buildWhereClause(filters);

      expect(whereClause).toEqual({
        year: TEST_CONSTANTS.YEARS.RECENT,
        season: TEST_CONSTANTS.SEASONS.SPRING,
        section: TEST_CONSTANTS.SECTIONS.MORNING,
        category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY,
        subcategory: '論理回路',
        difficulty: TEST_CONSTANTS.DIFFICULTIES.NORMAL
      });
    });

    it('should return empty object for no filters', () => {
      const whereClause = (questionRepository as any).buildWhereClause({});
      expect(whereClause).toEqual({});
    });
  });
});