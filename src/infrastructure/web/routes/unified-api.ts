/**
 * Unified API Routes - Simplified Architecture
 * 
 * This file contains all the unified API endpoints following consistent
 * naming conventions and response formats.
 */

import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import type { Variables } from '../middleware/auth.js';

// Unified response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
    version?: string;
    timestamp?: string;
  };
}

class UnifiedApiService {
  constructor(private prisma: PrismaClient) {}

  // Helper method to create success response
  private success<T>(data: T, metadata?: any): ApiResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'unified-api-v1.0',
        ...metadata
      }
    };
  }

  // Helper method to create error response
  private error(code: string, message: string, details?: any): ApiResponse {
    return {
      success: false,
      error: { code, message, details },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'unified-api-v1.0'
      }
    };
  }

  // ===== STUDY PLANS API =====
  
  async getStudyPlan(userId: number): Promise<ApiResponse> {
    try {
      const studyPlan = await this.prisma.studyPlan.findUnique({
        where: { userId },
        include: {
          weeks: {
            include: {
              days: true
            },
            orderBy: { weekNumber: 'asc' }
          }
        }
      });

      if (!studyPlan) {
        return this.error('STUDY_PLAN_NOT_FOUND', 'Study plan not found for this user');
      }

      return this.success(studyPlan);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch study plan', error);
    }
  }

  async createStudyPlan(userId: number, planData: any): Promise<ApiResponse> {
    try {
      // Check if user already has a study plan
      const existing = await this.prisma.studyPlan.findUnique({
        where: { userId }
      });

      let studyPlan;

      if (existing) {
        // If study plan exists, update it instead of creating a new one
        studyPlan = await this.prisma.studyPlan.update({
          where: { userId },
          data: {
            name: planData.name || existing.name,
            description: planData.description || existing.description,
            targetExamDate: planData.targetExamDate || existing.targetExamDate,
            templateId: planData.templateId || existing.templateId,
            updatedAt: new Date()
          },
          include: {
            weeks: {
              include: {
                days: true
              }
            }
          }
        });
      } else {
        // Create new study plan
        studyPlan = await this.prisma.studyPlan.create({
          data: {
            userId,
            name: planData.name || 'Default Study Plan',
            description: planData.description,
            targetExamDate: planData.targetExamDate,
            templateId: planData.templateId
          },
          include: {
            weeks: {
              include: {
                days: true
              }
            }
          }
        });
      }

      return this.success(studyPlan);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to create or update study plan', error);
    }
  }

  async updateStudyPlan(userId: number, planData: any): Promise<ApiResponse> {
    try {
      // Check if user has a study plan
      const existing = await this.prisma.studyPlan.findUnique({
        where: { userId }
      });

      if (!existing) {
        return this.error('STUDY_PLAN_NOT_FOUND', 'User does not have a study plan to update');
      }

      const studyPlan = await this.prisma.studyPlan.update({
        where: { userId },
        data: {
          name: planData.name || existing.name,
          description: planData.description || existing.description,
          targetExamDate: planData.targetExamDate || existing.targetExamDate,
          templateId: planData.templateId || existing.templateId,
          updatedAt: new Date()
        },
        include: {
          weeks: {
            include: {
              days: true
            }
          }
        }
      });

      return this.success(studyPlan);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to update study plan', error);
    }
  }

  async updateStudyDay(userId: number, dayId: number, updateData: any): Promise<ApiResponse> {
    try {
      // Verify ownership through studyWeek -> studyPlan
      const day = await this.prisma.studyDay.findFirst({
        where: {
          id: dayId,
          week: {
            studyPlan: { userId }
          }
        }
      });

      if (!day) {
        return this.error('STUDY_DAY_NOT_FOUND', 'Study day not found or access denied');
      }

      const updatedDay = await this.prisma.studyDay.update({
        where: { id: dayId },
        data: {
          actualTime: updateData.actualTime || updateData.actualHours * 60, // Convert hours to minutes
          completed: updateData.isCompleted,
          understanding: updateData.understanding,
          memo: updateData.notes
        }
      });

      return this.success(updatedDay);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to update study day', error);
    }
  }

  // ===== TEST SESSIONS API =====

  async getTestSessions(userId: number, limit = 10, offset = 0): Promise<ApiResponse> {
    try {
      const testSessions = await this.fetchAllTestSessions(userId, limit, offset)
      const unifiedSessions = this.unifyTestSessions(testSessions, limit)
      const pagination = this.buildPaginationMetadata(offset, limit, unifiedSessions.length)
      
      return this.success(unifiedSessions, { pagination })
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch test sessions', error)
    }
  }

  private async fetchAllTestSessions(userId: number, limit: number, offset: number) {
    const takeAmount = Math.ceil(limit / 3)
    const skipAmount = Math.floor(offset / 3)

    return await Promise.all([
      this.prisma.morningTest.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: takeAmount,
        skip: skipAmount
      }),
      this.prisma.afternoonTest.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: takeAmount,
        skip: skipAmount
      }),
      this.prisma.quizSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: takeAmount,
        skip: skipAmount
      })
    ])
  }

  private unifyTestSessions(testSessions: any[], limit: number) {
    const [morningTests, afternoonTests, quizSessions] = testSessions
    
    const unifiedSessions = [
      ...this.formatMorningTests(morningTests),
      ...this.formatAfternoonTests(afternoonTests),
      ...this.formatQuizSessions(quizSessions)
    ]

    return this.sortAndLimitSessions(unifiedSessions, limit)
  }

  private formatMorningTests(morningTests: any[]) {
    return morningTests.map(test => ({
      id: test.id,
      type: 'morning',
      category: test.category,
      totalQuestions: test.totalQuestions,
      correctAnswers: test.correctAnswers,
      score: (test.correctAnswers / test.totalQuestions) * 100,
      timeSpent: test.timeSpent,
      date: test.date,
      memo: test.memo
    }))
  }

  private formatAfternoonTests(afternoonTests: any[]) {
    return afternoonTests.map(test => ({
      id: test.id,
      type: 'afternoon',
      category: test.category,
      score: test.score,
      timeSpent: test.timeSpent,
      date: test.date,
      memo: test.memo
    }))
  }

  private formatQuizSessions(quizSessions: any[]) {
    return quizSessions.map(quiz => ({
      id: quiz.id,
      type: 'quiz',
      category: quiz.category,
      totalQuestions: quiz.totalQuestions,
      correctAnswers: quiz.correctAnswers,
      score: quiz.score,
      timeSpent: quiz.totalTime,
      startedAt: quiz.startedAt,
      completedAt: quiz.completedAt,
      isCompleted: quiz.isCompleted
    }))
  }

  private sortAndLimitSessions(sessions: any[], limit: number) {
    return sessions
      .sort((a, b) => {
        const aDate = 'date' in a ? a.date : a.startedAt
        const bDate = 'date' in b ? b.date : b.startedAt
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })
      .slice(0, limit)
  }

  private buildPaginationMetadata(offset: number, limit: number, totalResults: number) {
    return {
      page: Math.floor(offset / limit) + 1,
      limit,
      total: totalResults
    }
  }

  // Helper methods for createTestSession
  private async createMorningTestSession(userId: number, sessionData: any) {
    return await this.prisma.morningTest.create({
      data: {
        userId,
        category: sessionData.category,
        totalQuestions: sessionData.totalQuestions,
        correctAnswers: sessionData.correctAnswers || 0,
        timeSpent: sessionData.timeSpentMinutes * 60 || 0, // Convert to seconds
        date: sessionData.startedAt || new Date(),
        memo: sessionData.notes
      }
    });
  }

  private async createAfternoonTestSession(userId: number, sessionData: any) {
    return await this.prisma.afternoonTest.create({
      data: {
        userId,
        category: sessionData.category,
        score: sessionData.score || 0,
        timeSpent: sessionData.timeSpentMinutes * 60 || 0,
        date: sessionData.startedAt || new Date(),
        memo: sessionData.notes
      }
    });
  }

  private async createQuizSession(userId: number, sessionData: any) {
    return await this.prisma.quizSession.create({
      data: {
        userId,
        sessionType: 'practice', // Required field
        category: sessionData.category,
        totalQuestions: sessionData.totalQuestions,
        correctAnswers: sessionData.correctAnswers || 0,
        totalTime: sessionData.timeSpentMinutes * 60 || 0,
        score: sessionData.score || 0,
        isCompleted: sessionData.isCompleted || false,
        startedAt: sessionData.startedAt || new Date(),
        completedAt: sessionData.completedAt
      }
    });
  }

  async createTestSession(userId: number, sessionData: any): Promise<ApiResponse> {
    try {
      let session;
      
      switch (sessionData.sessionType) {
        case 'morning':
          session = await this.createMorningTestSession(userId, sessionData);
          break;
        case 'afternoon':
          session = await this.createAfternoonTestSession(userId, sessionData);
          break;
        case 'quiz':
          session = await this.createQuizSession(userId, sessionData);
          break;
        default:
          return this.error('INVALID_SESSION_TYPE', 'Session type must be morning, afternoon, or quiz');
      }

      return this.success(session);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to create test session', error);
    }
  }

  // ===== USER ANALYSIS API =====

  async getUserAnalysis(_userId: number, _analysisType?: string): Promise<ApiResponse> {
    return this.success([]);
  }

  async createUserAnalysis(_userId: number, _analysisData: unknown): Promise<ApiResponse> {
    return this.error('FEATURE_DISABLED', 'User analysis feature has been simplified and removed');
  }

  // ===== EXAM CONFIG API =====

  async getExamConfig(userId: number): Promise<ApiResponse> {
    try {
      const examConfig = await this.prisma.examConfig.findUnique({
        where: { userId },
      });

      if (!examConfig) {
        return this.error('EXAM_CONFIG_NOT_FOUND', 'Exam configuration not found');
      }

      // 残り日数を計算
      const now = new Date();
      const examDate = new Date(examConfig.examDate);
      const remainingDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return this.success({
        ...examConfig,
        remainingDays,
      });
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch exam config', error);
    }
  }

  async createExamConfig(userId: number, configData: any): Promise<ApiResponse> {
    try {
      // 既存の設定があるかチェック
      const existingConfig = await this.prisma.examConfig.findUnique({
        where: { userId },
      });

      let examConfig;
      if (existingConfig) {
        // 更新
        examConfig = await this.prisma.examConfig.update({
          where: { userId },
          data: {
            examDate: configData.examDate ? new Date(configData.examDate) : existingConfig.examDate,
            targetScore: configData.targetScore || existingConfig.targetScore,
          },
        });
      } else {
        // 新規作成
        examConfig = await this.prisma.examConfig.create({
          data: {
            userId,
            examDate: new Date(configData.examDate),
            targetScore: configData.targetScore,
          },
        });
      }

      // 残り日数を計算
      const now = new Date();
      const examDate = new Date(examConfig.examDate);
      const remainingDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return this.success({
        ...examConfig,
        remainingDays,
      });
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to create or update exam config', error);
    }
  }

  // ===== TOPIC SUGGESTIONS API =====

  async getTopicSuggestions(subject?: string, query?: string): Promise<ApiResponse> {
    try {
      // PR #24の元実装通り：既存記録と標準トピックを組み合わせ
      const { TOPIC_SUGGESTIONS } = await import('src/domain/constants/topic-suggestions.js');
      
      // 既存の学習記録から学習項目を取得
      const allLogs = await this.prisma.studyLog.findMany({
        select: { topics: true, subject: true }
      });
      
      const allTopics = new Set<string>();
      
      // 既存記録からトピックを収集
      for (const log of allLogs) {
        if (Array.isArray(log.topics)) {
          for (const topic of log.topics) {
            if (typeof topic === 'string') {
              allTopics.add(topic);
            }
          }
        }
      }
      
      // 標準トピックを追加
      if (subject && TOPIC_SUGGESTIONS[subject]) {
        for (const topic of TOPIC_SUGGESTIONS[subject]) {
          allTopics.add(topic);
        }
      } else {
        // 科目指定なしの場合は全トピックを追加
        for (const topics of Object.values(TOPIC_SUGGESTIONS)) {
          for (const topic of topics) {
            allTopics.add(topic);
          }
        }
      }
      
      let suggestions = Array.from(allTopics);
      
      // クエリでフィルタリング（元実装通り）
      if (query && query.trim().length > 0) {
        const lowerQuery = query.toLowerCase();
        suggestions = suggestions.filter(topic => 
          topic.toLowerCase().includes(lowerQuery)
        );
      }
      
      // 科目でフィルタリング（元実装通り）
      if (subject) {
        const subjectLogs = allLogs.filter(log => log.subject === subject);
        const subjectTopics = new Set<string>();
        
        for (const log of subjectLogs) {
          if (Array.isArray(log.topics)) {
            for (const topic of log.topics) {
              if (typeof topic === 'string') {
                subjectTopics.add(topic);
              }
            }
          }
        }
        
        suggestions = suggestions.filter(
          topic => subjectTopics.has(topic) || (TOPIC_SUGGESTIONS[subject]?.includes(topic))
        );
      }
      
      // 使用頻度でソート（元実装通り）
      const topicFrequency = new Map<string, number>();
      for (const log of allLogs) {
        if (Array.isArray(log.topics)) {
          for (const topic of log.topics) {
            if (typeof topic === 'string') {
              topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
            }
          }
        }
      }
      
      suggestions.sort((a, b) => {
        const freqA = topicFrequency.get(a) || 0;
        const freqB = topicFrequency.get(b) || 0;
        if (freqA !== freqB) {
          return freqB - freqA;
        }
        return a.localeCompare(b);
      });
      
      // 上位20件に制限
      return this.success(suggestions.slice(0, 20));
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch topic suggestions', error);
    }
  }

}

// ===== HONO ROUTES =====

export function createUnifiedApiRoutes(prisma: PrismaClient) {
  const app = new Hono<{ Variables: Variables }>();
  const service = new UnifiedApiService(prisma);

  // Study Plans
  app.get('/study-plans/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const result = await service.getStudyPlan(userId);
    return c.json(result, result.success ? 200 : 400);
  });

  app.post('/study-plans/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const body = await c.req.json();
    const result = await service.createStudyPlan(userId, body);
    return c.json(result, result.success ? 201 : 400);
  });

  app.put('/study-plans/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const body = await c.req.json();
    const result = await service.updateStudyPlan(userId, body);
    return c.json(result, result.success ? 200 : 400);
  });

  app.put('/study-plans/:userId/days/:dayId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const dayId = parseInt(c.req.param('dayId'));
    const body = await c.req.json();
    const result = await service.updateStudyDay(userId, dayId, body);
    return c.json(result, result.success ? 200 : 400);
  });

  // Test Sessions
  app.get('/test-sessions/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');
    const result = await service.getTestSessions(userId, limit, offset);
    return c.json(result, result.success ? 200 : 400);
  });

  app.post('/test-sessions/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const body = await c.req.json();
    const result = await service.createTestSession(userId, body);
    return c.json(result, result.success ? 201 : 400);
  });

  // User Analysis
  app.get('/user-analysis/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const analysisType = c.req.query('type');
    const result = await service.getUserAnalysis(userId, analysisType);
    return c.json(result, result.success ? 200 : 400);
  });

  app.post('/user-analysis/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const body = await c.req.json();
    const result = await service.createUserAnalysis(userId, body);
    return c.json(result, result.success ? 201 : 400);
  });

  // Topic Suggestions (PR #27 style)
  app.get('/topic-suggestions', async (c) => {
    const subject = c.req.query('subject');
    const query = c.req.query('query');
    const result = await service.getTopicSuggestions(subject, query);
    return c.json(result, result.success ? 200 : 400);
  });

  // Exam Config (query parameter support)
  app.get('/exam-config', async (c) => {
    const userId = parseInt(c.req.query('userId') || '');
    if (isNaN(userId)) {
      return c.json({ success: false, error: { code: 'INVALID_USER_ID', message: 'Valid userId is required' } }, 400);
    }
    const result = await service.getExamConfig(userId);
    return c.json(result, result.success ? 200 : 404);
  });

  app.post('/exam-config', async (c) => {
    const body = await c.req.json();
    
    // userIdをクエリパラメータ、ボディ、または認証コンテキストから取得
    let userId: number;
    const queryUserId = c.req.query('userId');
    const bodyUserId = body.userId;
    const authUserId = c.get('authUser')?.userId;
    
    if (queryUserId) {
      userId = parseInt(queryUserId);
    } else if (bodyUserId) {
      userId = parseInt(bodyUserId);
    } else if (authUserId) {
      userId = authUserId;
    } else {
      // デフォルトのテストユーザーID（開発環境用）
      userId = 1;
    }
    
    if (isNaN(userId)) {
      return c.json({ success: false, error: { code: 'INVALID_USER_ID', message: 'Valid userId is required' } }, 400);
    }
    
    const result = await service.createExamConfig(userId, body);
    return c.json(result, result.success ? 201 : 400);
  });

  return app;
}

export default createUnifiedApiRoutes;