import { describe, it, expect, beforeEach } from 'vitest';
import { AnswerQuestion } from '../../domain/usecases/AnswerQuestion';
import { QuestionFixtures, TEST_CONSTANTS } from '../fixtures/question-fixtures';
import { createMockQuestionRepository, createMockPrismaClient, MockHelpers, TEST_ERRORS } from '../helpers/mock-factories';

describe('AnswerQuestion UseCase', () => {
  let answerQuestionUseCase: AnswerQuestion;
  let mockQuestionRepository: ReturnType<typeof createMockQuestionRepository>;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockQuestionRepository = createMockQuestionRepository();
    mockPrisma = createMockPrismaClient();
    answerQuestionUseCase = new AnswerQuestion(mockQuestionRepository as any, mockPrisma as any);
  });

  const mockRequest = {
    userId: 1,
    questionId: TEST_CONSTANTS.QUESTION_IDS.VALID,
    userAnswer: TEST_CONSTANTS.ANSWERS.CORRECT,
    timeSpent: 30,
  };

  describe('execute', () => {
    it('should successfully process correct answer', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      const mockUserAnswer = { id: 123, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null); // No previous attempts

      const result = await answerQuestionUseCase.execute(mockRequest);

      expect(result).toEqual({
        result: mockAnswerResult,
        userAnswerId: 123,
      });

      expect(mockQuestionRepository.checkAnswer).toHaveBeenCalledWith(
        TEST_CONSTANTS.QUESTION_IDS.VALID,
        TEST_CONSTANTS.ANSWERS.CORRECT
      );

      expect(mockPrisma.userAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          questionId: TEST_CONSTANTS.QUESTION_IDS.VALID,
          userAnswer: TEST_CONSTANTS.ANSWERS.CORRECT,
          isCorrect: true,
          timeSpent: 30,
          attemptNumber: 1,
        },
      });
    });

    it('should successfully process incorrect answer', async () => {
      const mockAnswerResult = QuestionFixtures.createIncorrectAnswerResult(TEST_CONSTANTS.ANSWERS.INCORRECT);
      const mockUserAnswer = { id: 124, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const request = { ...mockRequest, userAnswer: TEST_CONSTANTS.ANSWERS.INCORRECT };
      const result = await answerQuestionUseCase.execute(request);

      expect(result).toEqual({
        result: mockAnswerResult,
        userAnswerId: 124,
      });

      expect(mockPrisma.userAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          questionId: TEST_CONSTANTS.QUESTION_IDS.VALID,
          userAnswer: TEST_CONSTANTS.ANSWERS.INCORRECT,
          isCorrect: false,
          timeSpent: 30,
          attemptNumber: 1,
        },
      });
    });

    it('should handle answer without time spent', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      const mockUserAnswer = { id: 125, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const request = { ...mockRequest };
      delete request.timeSpent;

      const result = await answerQuestionUseCase.execute(request);

      expect(result).toEqual({
        result: mockAnswerResult,
        userAnswerId: 125,
      });

      expect(mockPrisma.userAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          questionId: TEST_CONSTANTS.QUESTION_IDS.VALID,
          userAnswer: TEST_CONSTANTS.ANSWERS.CORRECT,
          isCorrect: true,
          timeSpent: null,
          attemptNumber: 1,
        },
      });
    });

    it('should handle multiple attempts correctly', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      const mockUserAnswer = { id: 126, attemptNumber: 3 };
      const mockPreviousAttempt = { id: 100, attemptNumber: 2 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(mockPreviousAttempt);

      const result = await answerQuestionUseCase.execute(mockRequest);

      expect(result.userAnswerId).toBe(126);
      expect(mockPrisma.userAnswer.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, questionId: TEST_CONSTANTS.QUESTION_IDS.VALID },
        orderBy: { attemptNumber: 'desc' },
      });

      expect(mockPrisma.userAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          questionId: TEST_CONSTANTS.QUESTION_IDS.VALID,
          userAnswer: TEST_CONSTANTS.ANSWERS.CORRECT,
          isCorrect: true,
          timeSpent: 30,
          attemptNumber: 3,
        },
      });
    });

    it('should handle answer without explanation', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerResultWithoutExplanation();
      const mockUserAnswer = { id: 127, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const result = await answerQuestionUseCase.execute(mockRequest);

      expect(result.result.explanation).toBeUndefined();
      expect(result.result.isCorrect).toBe(true);
    });
  });

  describe('getNextAttemptNumber (private method)', () => {
    it('should return 1 for first attempt', async () => {
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const attemptNumber = await (answerQuestionUseCase as any).getNextAttemptNumber(1, TEST_CONSTANTS.QUESTION_IDS.VALID);

      expect(attemptNumber).toBe(1);
      expect(mockPrisma.userAnswer.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, questionId: TEST_CONSTANTS.QUESTION_IDS.VALID },
        orderBy: { attemptNumber: 'desc' },
      });
    });

    it('should return incremented attempt number for subsequent attempts', async () => {
      const mockLastAttempt = { attemptNumber: 5 };
      mockPrisma.userAnswer.findFirst.mockResolvedValue(mockLastAttempt);

      const attemptNumber = await (answerQuestionUseCase as any).getNextAttemptNumber(1, TEST_CONSTANTS.QUESTION_IDS.VALID);

      expect(attemptNumber).toBe(6);
    });
  });

  describe('error handling', () => {
    it('should propagate question repository errors', async () => {
      MockHelpers.setupQuestionRepository.throwError(
        mockQuestionRepository, 
        'checkAnswer', 
        TEST_ERRORS.QUESTION_NOT_FOUND(TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT)
      );

      await expect(
        answerQuestionUseCase.execute({
          ...mockRequest,
          questionId: TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT,
        })
      ).rejects.toThrow(`Question not found: ${TEST_CONSTANTS.QUESTION_IDS.NONEXISTENT}`);
    });

    it('should propagate database creation errors', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);
      mockPrisma.userAnswer.create.mockRejectedValue(TEST_ERRORS.DATABASE_CONNECTION_FAILED);

      await expect(
        answerQuestionUseCase.execute(mockRequest)
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate attempt number retrieval errors', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.findFirst.mockRejectedValue(TEST_ERRORS.QUERY_TIMEOUT);

      await expect(
        answerQuestionUseCase.execute(mockRequest)
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('edge cases', () => {
    it('should handle zero userId', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      const mockUserAnswer = { id: 128, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const request = { ...mockRequest, userId: 0 };
      const result = await answerQuestionUseCase.execute(request);

      expect(result.userAnswerId).toBe(128);
      expect(mockPrisma.userAnswer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 0 })
        })
      );
    });

    it('should handle zero timeSpent', async () => {
      const mockAnswerResult = QuestionFixtures.createAnswerCheckResult();
      const mockUserAnswer = { id: 129, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const request = { ...mockRequest, timeSpent: 0 };
      const result = await answerQuestionUseCase.execute(request);

      expect(result.userAnswerId).toBe(129);
      expect(mockPrisma.userAnswer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ timeSpent: 0 })
        })
      );
    });

    it('should handle empty string answers', async () => {
      const mockAnswerResult = QuestionFixtures.createIncorrectAnswerResult('');
      const mockUserAnswer = { id: 130, attemptNumber: 1 };
      
      MockHelpers.setupQuestionRepository.checkAnswer(mockQuestionRepository, mockAnswerResult);
      mockPrisma.userAnswer.create.mockResolvedValue(mockUserAnswer);
      mockPrisma.userAnswer.findFirst.mockResolvedValue(null);

      const request = { ...mockRequest, userAnswer: '' };
      const result = await answerQuestionUseCase.execute(request);

      expect(result.result.userAnswer).toBe('');
      expect(result.result.isCorrect).toBe(false);
    });
  });
});