import { describe, it, expect, beforeEach } from 'vitest';
import { GetQuestion } from '../../domain/usecases/GetQuestion';
import { QuestionFilters, QuestionQueryOptions } from '../../domain/repositories/IQuestionRepository';
import { QuestionFixtures, TEST_CONSTANTS } from '../fixtures/question-fixtures';
import { createMockQuestionRepository, MockHelpers, TEST_ERRORS } from '../helpers/mock-factories';

describe('GetQuestion UseCase', () => {
  let getQuestionUseCase: GetQuestion;
  let mockQuestionRepository: ReturnType<typeof createMockQuestionRepository>;

  beforeEach(() => {
    mockQuestionRepository = createMockQuestionRepository();
    getQuestionUseCase = new GetQuestion(mockQuestionRepository as any);
  });

  const mockQuestion = QuestionFixtures.createBasicQuestion();
  const mockQuestions = QuestionFixtures.createMultipleQuestions(2);

  describe('execute', () => {
    it('should return question by id when questionId is provided', async () => {
      MockHelpers.setupQuestionRepository.findById(mockQuestionRepository, mockQuestion);

      const result = await getQuestionUseCase.execute({
        questionId: TEST_CONSTANTS.QUESTION_IDS.VALID,
      });

      expect(result).toEqual(mockQuestion);
      expect(mockQuestionRepository.findById).toHaveBeenCalledWith(TEST_CONSTANTS.QUESTION_IDS.VALID);
    });

    it('should return null when question not found by id', async () => {
      MockHelpers.setupQuestionRepository.findById(mockQuestionRepository, null);

      const result = await getQuestionUseCase.execute({
        questionId: TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT,
      });

      expect(result).toBeNull();
      expect(mockQuestionRepository.findById).toHaveBeenCalledWith(TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT);
    });

    it('should return first question from findMany when questionId not provided', async () => {
      MockHelpers.setupQuestionRepository.findMany(mockQuestionRepository, mockQuestions);

      const filters: QuestionFilters = { category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY };
      const options: QuestionQueryOptions = { limit: 5 };

      const result = await getQuestionUseCase.execute({ filters, options });

      expect(result).toEqual(mockQuestions[0]);
      expect(mockQuestionRepository.findMany).toHaveBeenCalledWith(filters, { ...options, limit: 1 });
    });

    it('should return null when findMany returns empty array', async () => {
      MockHelpers.setupQuestionRepository.findMany(mockQuestionRepository, []);

      const result = await getQuestionUseCase.execute({});

      expect(result).toBeNull();
      expect(mockQuestionRepository.findMany).toHaveBeenCalledWith(undefined, { limit: 1 });
    });
  });

  describe('getMany', () => {
    it('should return multiple questions with filters and options', async () => {
      MockHelpers.setupQuestionRepository.findMany(mockQuestionRepository, mockQuestions);

      const filters: QuestionFilters = {
        category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY,
        year: TEST_CONSTANTS.YEARS.RECENT,
      };
      const options: QuestionQueryOptions = { limit: 10, random: true };

      const result = await getQuestionUseCase.getMany({ filters, options });

      expect(result).toEqual(mockQuestions);
      expect(mockQuestionRepository.findMany).toHaveBeenCalledWith(filters, options);
    });

    it('should work without filters and options', async () => {
      MockHelpers.setupQuestionRepository.findMany(mockQuestionRepository, mockQuestions);

      const result = await getQuestionUseCase.getMany({});

      expect(result).toEqual(mockQuestions);
      expect(mockQuestionRepository.findMany).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('getRandomQuestions', () => {
    it('should return random questions with specified count', async () => {
      const randomQuestions = QuestionFixtures.createMultipleQuestions(3);
      MockHelpers.setupQuestionRepository.findRandom(mockQuestionRepository, randomQuestions);

      const result = await getQuestionUseCase.getRandomQuestions(3);

      expect(result).toEqual(randomQuestions);
      expect(mockQuestionRepository.findRandom).toHaveBeenCalledWith(3, undefined);
    });

    it('should return random questions with filters', async () => {
      const categoryQuestions = QuestionFixtures.createQuestionsByCategory(TEST_CONSTANTS.CATEGORIES.BASIC_THEORY, 2);
      MockHelpers.setupQuestionRepository.findRandom(mockQuestionRepository, categoryQuestions);

      const filters: QuestionFilters = {
        category: TEST_CONSTANTS.CATEGORIES.BASIC_THEORY,
        difficulty: TEST_CONSTANTS.DIFFICULTIES.NORMAL,
      };
      const result = await getQuestionUseCase.getRandomQuestions(5, filters);

      expect(result).toEqual(categoryQuestions);
      expect(mockQuestionRepository.findRandom).toHaveBeenCalledWith(5, filters);
    });

    it('should handle empty result from findRandom', async () => {
      MockHelpers.setupQuestionRepository.findRandom(mockQuestionRepository, []);

      const result = await getQuestionUseCase.getRandomQuestions(10);

      expect(result).toEqual([]);
      expect(mockQuestionRepository.findRandom).toHaveBeenCalledWith(10, undefined);
    });
  });

  describe('getQuestionsByCategory', () => {
    it('should return questions by category with default options', async () => {
      const categoryQuestions = QuestionFixtures.createQuestionsByCategory(TEST_CONSTANTS.CATEGORIES.BASIC_THEORY, 3);
      MockHelpers.setupQuestionRepository.findByCategory(mockQuestionRepository, categoryQuestions);

      const result = await getQuestionUseCase.getQuestionsByCategory(TEST_CONSTANTS.CATEGORIES.BASIC_THEORY);

      expect(result).toEqual(categoryQuestions);
      expect(mockQuestionRepository.findByCategory).toHaveBeenCalledWith(
        TEST_CONSTANTS.CATEGORIES.BASIC_THEORY,
        undefined,
      );
    });

    it('should return questions by category with custom options', async () => {
      const categoryQuestions = QuestionFixtures.createQuestionsByCategory(
        TEST_CONSTANTS.CATEGORIES.COMPUTER_SYSTEM,
        2,
      );
      MockHelpers.setupQuestionRepository.findByCategory(mockQuestionRepository, categoryQuestions);

      const options: QuestionQueryOptions = { limit: 20, offset: 5 };
      const result = await getQuestionUseCase.getQuestionsByCategory(
        TEST_CONSTANTS.CATEGORIES.COMPUTER_SYSTEM,
        options,
      );

      expect(result).toEqual(categoryQuestions);
      expect(mockQuestionRepository.findByCategory).toHaveBeenCalledWith(
        TEST_CONSTANTS.CATEGORIES.COMPUTER_SYSTEM,
        options,
      );
    });

    it('should handle empty category results', async () => {
      MockHelpers.setupQuestionRepository.findByCategory(mockQuestionRepository, []);

      const result = await getQuestionUseCase.getQuestionsByCategory(TEST_CONSTANTS.CATEGORIES.NONEXISTENT);

      expect(result).toEqual([]);
      expect(mockQuestionRepository.findByCategory).toHaveBeenCalledWith(
        TEST_CONSTANTS.CATEGORIES.NONEXISTENT,
        undefined,
      );
    });
  });

  describe('countQuestions', () => {
    it('should return question count with filters', async () => {
      const expectedCount = 150;
      MockHelpers.setupQuestionRepository.countQuestions(mockQuestionRepository, expectedCount);

      const filters: QuestionFilters = {
        year: TEST_CONSTANTS.YEARS.RECENT,
        section: TEST_CONSTANTS.SECTIONS.MORNING,
      };
      const result = await getQuestionUseCase.countQuestions(filters);

      expect(result).toBe(expectedCount);
      expect(mockQuestionRepository.countQuestions).toHaveBeenCalledWith(filters);
    });

    it('should return total question count without filters', async () => {
      const expectedCount = 500;
      MockHelpers.setupQuestionRepository.countQuestions(mockQuestionRepository, expectedCount);

      const result = await getQuestionUseCase.countQuestions();

      expect(result).toBe(expectedCount);
      expect(mockQuestionRepository.countQuestions).toHaveBeenCalledWith(undefined);
    });

    it('should handle zero count', async () => {
      MockHelpers.setupQuestionRepository.countQuestions(mockQuestionRepository, 0);

      const filters: QuestionFilters = { category: TEST_CONSTANTS.CATEGORIES.NONEXISTENT };
      const result = await getQuestionUseCase.countQuestions(filters);

      expect(result).toBe(0);
      expect(mockQuestionRepository.countQuestions).toHaveBeenCalledWith(filters);
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors in execute', async () => {
      MockHelpers.setupQuestionRepository.throwError(
        mockQuestionRepository,
        'findById',
        TEST_ERRORS.DATABASE_CONNECTION_FAILED,
      );

      await expect(getQuestionUseCase.execute({ questionId: TEST_CONSTANTS.QUESTION_IDS.VALID })).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate repository errors in getMany', async () => {
      MockHelpers.setupQuestionRepository.throwError(mockQuestionRepository, 'findMany', TEST_ERRORS.QUERY_TIMEOUT);

      await expect(getQuestionUseCase.getMany({ filters: { year: TEST_CONSTANTS.YEARS.RECENT } })).rejects.toThrow(
        'Query timeout',
      );
    });

    it('should propagate repository errors in getRandomQuestions', async () => {
      MockHelpers.setupQuestionRepository.throwError(
        mockQuestionRepository,
        'findRandom',
        TEST_ERRORS.RANDOM_QUERY_FAILED,
      );

      await expect(getQuestionUseCase.getRandomQuestions(5)).rejects.toThrow('Random query failed');
    });

    it('should propagate repository errors in countQuestions', async () => {
      MockHelpers.setupQuestionRepository.throwError(
        mockQuestionRepository,
        'countQuestions',
        TEST_ERRORS.COUNT_QUERY_FAILED,
      );

      await expect(getQuestionUseCase.countQuestions()).rejects.toThrow('Count query failed');
    });
  });
});
