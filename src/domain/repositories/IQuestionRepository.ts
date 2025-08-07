import { Question } from '@prisma/client';

export interface QuestionFilters {
  year?: number;
  season?: string;
  section?: string;
  category?: string;
  subcategory?: string;
  difficulty?: number;
}

export interface QuestionQueryOptions {
  limit?: number;
  offset?: number;
  random?: boolean;
}

export interface AnswerCheckResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  userAnswer: string;
}

export interface IQuestionRepository {
  findById(id: string): Promise<Question | null>;
  findMany(filters?: QuestionFilters, options?: QuestionQueryOptions): Promise<Question[]>;
  findByCategory(category: string, options?: QuestionQueryOptions): Promise<Question[]>;
  findRandom(count: number, filters?: QuestionFilters): Promise<Question[]>;
  checkAnswer(questionId: string, userAnswer: string): Promise<AnswerCheckResult>;
  getQuestionWithChoices(questionId: string): Promise<Question | null>;
  countQuestions(filters?: QuestionFilters): Promise<number>;
}