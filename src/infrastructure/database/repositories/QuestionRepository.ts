import { PrismaClient, Question } from '@prisma/client';
import { 
  IQuestionRepository, 
  QuestionFilters, 
  QuestionQueryOptions, 
  AnswerCheckResult 
} from '../../../domain/repositories/IQuestionRepository';

export class QuestionRepository implements IQuestionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Question | null> {
    return await this.prisma.question.findUnique({
      where: { id }
    });
  }

  async findMany(
    filters: QuestionFilters = {}, 
    options: QuestionQueryOptions = {}
  ): Promise<Question[]> {
    const where = this.buildWhereClause(filters);
    const { limit, offset, random } = options;

    if (random && limit) {
      return this.findRandom(limit, filters);
    }

    return await this.prisma.question.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { year: 'desc' },
        { season: 'desc' },
        { section: 'asc' },
        { number: 'asc' }
      ]
    });
  }

  async findByCategory(
    category: string, 
    options: QuestionQueryOptions = {}
  ): Promise<Question[]> {
    return this.findMany({ category }, options);
  }

  async findRandom(count: number, filters: QuestionFilters = {}): Promise<Question[]> {
    const where = this.buildWhereClause(filters);
    
    // PostgreSQLのRANDOM()を使用してランダム取得
    const questions = await this.prisma.$queryRaw<Question[]>`
      SELECT * FROM questions 
      ${where ? this.buildRawWhereClause(filters) : ''}
      ORDER BY RANDOM() 
      LIMIT ${count}
    `;

    return questions;
  }

  async checkAnswer(questionId: string, userAnswer: string): Promise<AnswerCheckResult> {
    const question = await this.findById(questionId);
    
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    const isCorrect = question.answer.toLowerCase() === userAnswer.toLowerCase();

    return {
      isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation || undefined,
      userAnswer
    };
  }

  async getQuestionWithChoices(questionId: string): Promise<Question | null> {
    // choicesはJSONフィールドなので、そのまま返却
    return this.findById(questionId);
  }

  async countQuestions(filters: QuestionFilters = {}): Promise<number> {
    const where = this.buildWhereClause(filters);
    return await this.prisma.question.count({ where });
  }

  private buildWhereClause(filters: QuestionFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters.year !== undefined) {
      where.year = filters.year;
    }
    if (filters.season) {
      where.season = filters.season;
    }
    if (filters.section) {
      where.section = filters.section;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.subcategory) {
      where.subcategory = filters.subcategory;
    }
    if (filters.difficulty !== undefined) {
      where.difficulty = filters.difficulty;
    }

    return where;
  }

  private buildRawWhereClause(filters: QuestionFilters): string {
    const conditions: string[] = [];

    if (filters.year !== undefined) {
      conditions.push(`year = ${filters.year}`);
    }
    if (filters.season) {
      conditions.push(`season = '${filters.season}'`);
    }
    if (filters.section) {
      conditions.push(`section = '${filters.section}'`);
    }
    if (filters.category) {
      conditions.push(`category = '${filters.category}'`);
    }
    if (filters.subcategory) {
      conditions.push(`subcategory = '${filters.subcategory}'`);
    }
    if (filters.difficulty !== undefined) {
      conditions.push(`difficulty = ${filters.difficulty}`);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }
}