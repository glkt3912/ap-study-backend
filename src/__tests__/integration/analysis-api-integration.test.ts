import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

// Mock modules at the top level BEFORE imports
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    studyLog: {
      findMany: vi.fn(),
    },
    userAnswer: {
      findMany: vi.fn(),
    },
    studyPlan: {
      findUnique: vi.fn(),
    },
    studyWeek: {
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';
import { createStudyRoutes } from '../../infrastructure/web/routes/study';

// Access mock after import
const mockPrisma = (new PrismaClient() as any);

describe('Analysis API Integration Tests', () => {
  let app: Hono;
  
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User'
  };

  const mockStudyLogs = [
    {
      id: 1,
      userId: 1,
      studyDate: new Date('2024-01-15'),
      studyTime: 120,
      topics: ['データベース'],
      understanding: 4,
      createdAt: new Date()
    },
    {
      id: 2,
      userId: 1,
      studyDate: new Date('2024-01-16'),
      studyTime: 90,
      topics: ['セキュリティ'],
      understanding: 3,
      createdAt: new Date()
    }
  ];

  const mockUserAnswers = [
    {
      id: 1,
      userId: 1,
      questionId: 1,
      selectedAnswer: 'A',
      isCorrect: true,
      createdAt: new Date('2024-01-15')
    },
    {
      id: 2,
      userId: 1,
      questionId: 2,
      selectedAnswer: 'B',
      isCorrect: false,
      createdAt: new Date('2024-01-16')
    }
  ];

  beforeEach(() => {
    app = new Hono();
    const mockUseCases = {
      getStudyPlanUseCase: {} as any,
      updateStudyProgressUseCase: {} as any
    };
    app.route('/', createStudyRoutes(mockUseCases.getStudyPlanUseCase, mockUseCases.updateStudyProgressUseCase));
    vi.clearAllMocks();
  });

  describe('GET /api/study/analytics/:userId', () => {
    it('should return comprehensive study analytics', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.findMany.mockResolvedValue(mockStudyLogs);
      mockPrisma.userAnswer.findMany.mockResolvedValue(mockUserAnswers);

      // Act
      const response = await app.request('/api/study/analytics/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Study time analytics
      expect(data.data.totalStudyTime).toBe(210); // 120 + 90
      expect(data.data.averageStudyTime).toBe(105); // 210 / 2
      expect(data.data.studyDays).toBe(2);
      
      // Understanding analytics
      expect(data.data.averageUnderstanding).toBeCloseTo(3.5); // (4 + 3) / 2
      
      // Quiz performance analytics
      expect(data.data.totalQuestions).toBe(2);
      expect(data.data.correctAnswers).toBe(1);
      expect(data.data.accuracy).toBe(50); // 1/2 * 100
      
      // Topic analytics
      expect(data.data.topicAnalytics).toBeDefined();
      expect(data.data.topicAnalytics).toContainEqual(
        expect.objectContaining({
          topic: 'データベース',
          studyTime: 120,
          understanding: 4
        })
      );
    });

    it('should filter analytics by date range', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.findMany.mockResolvedValue([mockStudyLogs[0]]);
      mockPrisma.userAnswer.findMany.mockResolvedValue([mockUserAnswers[0]]);

      // Act
      const response = await app.request('/api/study/analytics/1?startDate=2024-01-15&endDate=2024-01-15');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalStudyTime).toBe(120);
      expect(data.data.accuracy).toBe(100); // 1/1 * 100
    });

    it('should handle user with no study data', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.findMany.mockResolvedValue([]);
      mockPrisma.userAnswer.findMany.mockResolvedValue([]);

      // Act
      const response = await app.request('/api/study/analytics/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalStudyTime).toBe(0);
      expect(data.data.accuracy).toBe(0);
    });
  });

  describe('GET /api/study/progress/:userId', () => {
    it('should return study progress tracking', async () => {
      // Arrange
      const mockStudyPlan = {
        id: 1,
        userId: 1,
        totalWeeks: 12,
        currentWeek: 3
      };
      const mockStudyWeeks = [
        { id: 1, weekNumber: 1, completed: true, completionRate: 100 },
        { id: 2, weekNumber: 2, completed: true, completionRate: 90 },
        { id: 3, weekNumber: 3, completed: false, completionRate: 60 }
      ];
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyPlan.findUnique.mockResolvedValue(mockStudyPlan);
      mockPrisma.studyWeek.findMany.mockResolvedValue(mockStudyWeeks);

      // Act
      const response = await app.request('/api/study/progress/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalWeeks).toBe(12);
      expect(data.data.currentWeek).toBe(3);
      expect(data.data.overallProgress).toBeCloseTo(83.33); // (100+90+60)/3
      expect(data.data.weeklyProgress).toHaveLength(3);
    });
  });

  describe('GET /api/study/predictions/:userId', () => {
    it('should return exam success prediction', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.findMany.mockResolvedValue(mockStudyLogs);
      mockPrisma.userAnswer.findMany.mockResolvedValue(mockUserAnswers);

      // Act
      const response = await app.request('/api/study/predictions/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Prediction metrics
      expect(data.data.successProbability).toBeGreaterThanOrEqual(0);
      expect(data.data.successProbability).toBeLessThanOrEqual(100);
      expect(data.data.recommendedStudyTime).toBeGreaterThan(0);
      expect(data.data.weakAreas).toBeDefined();
      expect(data.data.strongAreas).toBeDefined();
      
      // Recommendations
      expect(data.data.recommendations).toBeDefined();
      expect(Array.isArray(data.data.recommendations)).toBe(true);
    });

    it('should provide different predictions based on performance', async () => {
      // Arrange - High performance user
      const highPerformanceAnswers = [
        { id: 1, userId: 1, questionId: 1, isCorrect: true },
        { id: 2, userId: 1, questionId: 2, isCorrect: true },
        { id: 3, userId: 1, questionId: 3, isCorrect: true }
      ];
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.findMany.mockResolvedValue(mockStudyLogs);
      mockPrisma.userAnswer.findMany.mockResolvedValue(highPerformanceAnswers);

      // Act
      const response = await app.request('/api/study/predictions/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.successProbability).toBeGreaterThan(70); // Should be high for good performance
    });
  });

  describe('GET /api/study/recommendations/:userId', () => {
    it('should return personalized study recommendations', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.findMany.mockResolvedValue(mockStudyLogs);
      mockPrisma.userAnswer.findMany.mockResolvedValue(mockUserAnswers);

      // Act
      const response = await app.request('/api/study/recommendations/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      expect(data.data.recommendations).toBeDefined();
      expect(Array.isArray(data.data.recommendations)).toBe(true);
      expect(data.data.recommendations.length).toBeGreaterThan(0);
      
      // Each recommendation should have required fields
      data.data.recommendations.forEach((rec: any) => {
        expect(rec.type).toBeDefined();
        expect(rec.priority).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.actionItems).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const response = await app.request('/api/study/analytics/999');

      // Assert
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('User not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await app.request('/api/study/analytics/1');

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});