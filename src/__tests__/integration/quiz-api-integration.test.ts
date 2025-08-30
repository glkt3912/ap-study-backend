import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

// Mock modules at the top level BEFORE imports
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userAnswer: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    quizSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';
import { createQuizRoutes } from '../../infrastructure/web/routes/quiz';

// Access mock after import
const mockPrisma = (new PrismaClient() as any);

describe('Quiz API Integration Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', createQuizRoutes());
    vi.clearAllMocks();
  });

  describe('GET /api/quiz/questions', () => {
    it('should return quiz questions', async () => {
      // Arrange
      const mockQuestions = [
        {
          id: 1,
          questionText: 'Test question 1',
          choices: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Test explanation',
          year: 2024,
          category: 'technology'
        }
      ];
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      // Act
      const response = await app.request('/api/quiz/questions?category=technology&limit=1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].questionText).toBe('Test question 1');
    });

    it('should handle invalid category parameter', async () => {
      // Act
      const response = await app.request('/api/quiz/questions?category=invalid');

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/quiz/answer', () => {
    it('should record quiz answer', async () => {
      // Arrange
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockAnswer = {
        id: 1,
        userId: 1,
        questionId: 1,
        selectedAnswer: 'A',
        isCorrect: true,
        createdAt: new Date()
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userAnswer.create.mockResolvedValue(mockAnswer);

      // Act
      const response = await app.request('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: 1,
          selectedAnswer: 'A',
          userId: 1
        }),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.isCorrect).toBe(true);
    });
  });

  describe('GET /api/quiz/session/:sessionId', () => {
    it('should return quiz session details', async () => {
      // Arrange
      const mockSession = {
        id: 1,
        userId: 1,
        totalQuestions: 10,
        correctAnswers: 8,
        completedAt: new Date(),
        createdAt: new Date()
      };
      mockPrisma.quizSession.findUnique.mockResolvedValue(mockSession);

      // Act
      const response = await app.request('/api/quiz/session/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.correctAnswers).toBe(8);
    });

    it('should handle non-existent session', async () => {
      // Arrange
      mockPrisma.quizSession.findUnique.mockResolvedValue(null);

      // Act
      const response = await app.request('/api/quiz/session/999');

      // Assert
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});