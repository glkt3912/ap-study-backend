/**
 * Unified API Routes - Simplified Architecture
 * 
 * This file contains all the unified API endpoints following consistent
 * naming conventions and response formats.
 */

import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

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

      if (existing) {
        return this.error('STUDY_PLAN_EXISTS', 'User already has a study plan');
      }

      const studyPlan = await this.prisma.studyPlan.create({
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

      return this.success(studyPlan);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to create study plan', error);
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

  async getUserAnalysis(userId: number, analysisType?: string): Promise<ApiResponse> {
    try {
      // Fetch from AnalysisResult and PredictionResult tables
      const [analysisResults, predictionResults] = await Promise.all([
        this.prisma.analysisResult.findMany({
          where: { userId },
          orderBy: { analysisDate: 'desc' },
          take: 5
        }),
        this.prisma.predictionResult.findMany({
          where: { userId },
          orderBy: { predictionDate: 'desc' },
          take: 5
        })
      ]);

      // Unified format
      const unifiedAnalysis = [
        ...analysisResults.map(result => ({
          id: result.id,
          type: 'learning_efficiency',
          date: result.analysisDate,
          overallScore: result.overallScore,
          studyPattern: result.studyPattern,
          weaknessAnalysis: result.weaknessAnalysis,
          studyRecommendation: result.studyRecommendation,
          createdAt: result.createdAt
        })),
        ...predictionResults.map(result => ({
          id: result.id,
          type: 'prediction',
          date: result.predictionDate,
          examDate: result.examDate,
          passProbability: result.passProbability,
          examReadiness: result.examReadiness,
          studyTimeRequired: result.studyTimePrediction,
          createdAt: result.createdAt
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Filter by type if specified
      const filteredResults = analysisType 
        ? unifiedAnalysis.filter(item => item.type === analysisType)
        : unifiedAnalysis;

      return this.success(filteredResults.slice(0, 10));
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch user analysis', error);
    }
  }

  // Helper methods for createUserAnalysis
  private async createPredictionAnalysis(userId: number, analysisData: any) {
    return await this.prisma.predictionResult.create({
      data: {
        userId,
        predictionDate: new Date(),
        examDate: analysisData.targetExamDate,
        passProbability: analysisData.passProbability || {},
        examReadiness: analysisData.estimatedReadiness || {},
        studyTimePrediction: analysisData.studyTimeRequired || {},
        modelVersion: 'unified-api-v1.0',
        scorePrediction: {}
      }
    });
  }

  private async createAnalysisResult(userId: number, analysisData: any) {
    return await this.prisma.analysisResult.create({
      data: {
        userId,
        analysisDate: new Date(),
        overallScore: analysisData.overallScore,
        studyPattern: analysisData.studyPattern || {},
        weaknessAnalysis: {
          overallWeakness: analysisData.weakAreasRating,
          weakAreas: analysisData.weakSubjects?.split(',') || []
        },
        studyRecommendation: {
          summary: analysisData.recommendations,
          strongAreas: analysisData.strongSubjects?.split(',') || []
        }
      }
    });
  }

  async createUserAnalysis(userId: number, analysisData: any): Promise<ApiResponse> {
    try {
      const analysis = analysisData.analysisType === 'prediction'
        ? await this.createPredictionAnalysis(userId, analysisData)
        : await this.createAnalysisResult(userId, analysisData);

      return this.success(analysis);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to create user analysis', error);
    }
  }

  // ===== REVIEW ENTRIES API =====

  async getReviewEntries(userId: number, activeOnly = true): Promise<ApiResponse> {
    try {
      const whereClause: any = { userId };
      if (activeOnly) {
        whereClause.isCompleted = false;
      }

      const entries = await this.prisma.reviewItem.findMany({
        where: whereClause,
        orderBy: { nextReviewDate: 'asc' }
      });

      return this.success(entries);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch review entries', error);
    }
  }

  async getTodayReviews(userId: number): Promise<ApiResponse> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const reviews = await this.prisma.reviewItem.findMany({
        where: {
          userId,
          isCompleted: false,
          nextReviewDate: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        orderBy: { nextReviewDate: 'asc' }
      });

      return this.success(reviews);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to fetch today reviews', error);
    }
  }

  async completeReview(userId: number, entryId: number, understanding: number): Promise<ApiResponse> {
    try {
      // Verify ownership
      const entry = await this.prisma.reviewItem.findFirst({
        where: { id: entryId, userId }
      });

      if (!entry) {
        return this.error('REVIEW_ENTRY_NOT_FOUND', 'Review entry not found or access denied');
      }

      // Calculate next review interval using spaced repetition
      const currentInterval = entry.intervalDays;
      let nextInterval = currentInterval;
      
      if (understanding >= 4) {
        nextInterval = Math.min(currentInterval * 2, 30); // Max 30 days
      } else if (understanding >= 2) {
        nextInterval = currentInterval;
      } else {
        nextInterval = Math.max(Math.floor(currentInterval / 2), 1); // Min 1 day
      }

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

      const updatedEntry = await this.prisma.reviewItem.update({
        where: { id: entryId },
        data: {
          lastStudyDate: new Date(),
          nextReviewDate,
          reviewCount: entry.reviewCount + 1,
          intervalDays: nextInterval,
          understanding
        }
      });

      return this.success(updatedEntry);
    } catch (error) {
      return this.error('INTERNAL_ERROR', 'Failed to complete review', error);
    }
  }
}

// ===== HONO ROUTES =====

export function createUnifiedApiRoutes(prisma: PrismaClient) {
  const app = new Hono();
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

  // Review Entries
  app.get('/review-entries/:userId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const activeOnly = c.req.query('active') !== 'false';
    const result = await service.getReviewEntries(userId, activeOnly);
    return c.json(result, result.success ? 200 : 400);
  });

  app.get('/review-entries/:userId/today', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const result = await service.getTodayReviews(userId);
    return c.json(result, result.success ? 200 : 400);
  });

  app.put('/review-entries/:userId/:entryId', async (c) => {
    const userId = parseInt(c.req.param('userId'));
    const entryId = parseInt(c.req.param('entryId'));
    const body = await c.req.json();
    const result = await service.completeReview(userId, entryId, body.understanding);
    return c.json(result, result.success ? 200 : 400);
  });

  return app;
}

export default createUnifiedApiRoutes;