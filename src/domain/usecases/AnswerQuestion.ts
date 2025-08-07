import { IQuestionRepository, AnswerCheckResult } from '../repositories/IQuestionRepository';
import { IStudyLogRepository } from '../repositories/IStudyLogRepository';
import { PrismaClient } from '@prisma/client';

export interface AnswerQuestionRequest {
  userId: number;
  questionId: string;
  userAnswer: string;
  timeSpent?: number;
}

export interface AnswerQuestionResponse {
  result: AnswerCheckResult;
  userAnswerId: number;
}

export class AnswerQuestion {
  constructor(
    private questionRepository: IQuestionRepository,
    private prisma: PrismaClient
  ) {}

  async execute(request: AnswerQuestionRequest): Promise<AnswerQuestionResponse> {
    const { userId, questionId, userAnswer, timeSpent } = request;

    // 正解チェック
    const result = await this.questionRepository.checkAnswer(questionId, userAnswer);

    // ユーザー回答を記録
    const userAnswerRecord = await this.prisma.userAnswer.create({
      data: {
        userId,
        questionId,
        userAnswer,
        isCorrect: result.isCorrect,
        timeSpent: timeSpent || null,
        attemptNumber: await this.getNextAttemptNumber(userId, questionId)
      }
    });

    return {
      result,
      userAnswerId: userAnswerRecord.id
    };
  }

  private async getNextAttemptNumber(userId: number, questionId: string): Promise<number> {
    const lastAttempt = await this.prisma.userAnswer.findFirst({
      where: { userId, questionId },
      orderBy: { attemptNumber: 'desc' }
    });

    return (lastAttempt?.attemptNumber || 0) + 1;
  }
}