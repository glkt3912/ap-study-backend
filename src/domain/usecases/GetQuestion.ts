import { Question } from '@prisma/client';
import { IQuestionRepository, QuestionFilters, QuestionQueryOptions } from '../repositories/IQuestionRepository';

export interface GetQuestionRequest {
  questionId?: string;
  filters?: QuestionFilters;
  options?: QuestionQueryOptions;
}

export interface GetQuestionsRequest {
  filters?: QuestionFilters;
  options?: QuestionQueryOptions;
}

export class GetQuestion {
  constructor(private questionRepository: IQuestionRepository) {}

  async execute(request: GetQuestionRequest): Promise<Question | null> {
    if (request.questionId) {
      return await this.questionRepository.findById(request.questionId);
    }

    const questions = await this.questionRepository.findMany(
      request.filters,
      { ...request.options, limit: 1 }
    );

    return questions[0] || null;
  }

  async getMany(request: GetQuestionsRequest): Promise<Question[]> {
    return await this.questionRepository.findMany(
      request.filters,
      request.options
    );
  }

  async getRandomQuestions(
    count: number,
    filters?: QuestionFilters
  ): Promise<Question[]> {
    return await this.questionRepository.findRandom(count, filters);
  }

  async getQuestionsByCategory(
    category: string,
    options?: QuestionQueryOptions
  ): Promise<Question[]> {
    return await this.questionRepository.findByCategory(category, options);
  }

  async countQuestions(filters?: QuestionFilters): Promise<number> {
    return await this.questionRepository.countQuestions(filters);
  }
}