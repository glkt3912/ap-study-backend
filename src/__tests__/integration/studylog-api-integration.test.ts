import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

// Mock modules at the top level BEFORE imports
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    studyLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studyWeek: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';
import studylogRoutes from '../../infrastructure/web/routes/studylog';

// Access mock after import
const mockPrisma = (new PrismaClient() as any);

describe('StudyLog API Integration Tests', () => {
  let app: Hono;
  
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User'
  };

  const mockStudyLog = {
    id: 1,
    userId: 1,
    studyDate: new Date('2024-01-15'),
    studyTime: 120, // minutes
    topics: ['データベース', 'セキュリティ'],
    understanding: 4,
    memo: 'SQLの基礎を学習',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    app = new Hono();
    app.route('/', studylogRoutes);
    vi.clearAllMocks();
  });

  describe('POST /api/studylog', () => {
    it('should create study log successfully', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studyLog.create.mockResolvedValue(mockStudyLog);

      // Act
      const response = await app.request('/api/studylog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          studyDate: '2024-01-15',
          studyTime: 120,
          topics: ['データベース', 'セキュリティ'],
          understanding: 4,
          memo: 'SQLの基礎を学習'
        }),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.studyTime).toBe(120);
      expect(data.data.topics).toContain('データベース');
    });

    it('should validate required fields', async () => {
      // Act
      const response = await app.request('/api/studylog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          studyTime: -10, // Invalid negative time
          understanding: 6 // Invalid rating (should be 1-5)
        }),
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/studylog/user/:userId', () => {
    it('should return user study logs', async () => {
      // Arrange
      const mockStudyLogs = [mockStudyLog, {
        ...mockStudyLog,
        id: 2,
        studyDate: new Date('2024-01-16'),
        topics: ['ネットワーク']
      }];
      mockPrisma.studyLog.findMany.mockResolvedValue(mockStudyLogs);

      // Act
      const response = await app.request('/api/studylog/user/1');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].topics).toContain('データベース');
    });

    it('should filter by date range', async () => {
      // Arrange
      mockPrisma.studyLog.findMany.mockResolvedValue([mockStudyLog]);

      // Act
      const response = await app.request('/api/studylog/user/1?startDate=2024-01-01&endDate=2024-01-31');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockPrisma.studyLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
            studyDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      );
    });
  });

  describe('PUT /api/studylog/:id', () => {
    it('should update study log successfully', async () => {
      // Arrange
      const updatedLog = { ...mockStudyLog, understanding: 5, memo: '理解度向上' };
      mockPrisma.studyLog.findUnique.mockResolvedValue(mockStudyLog);
      mockPrisma.studyLog.update.mockResolvedValue(updatedLog);

      // Act
      const response = await app.request('/api/studylog/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          understanding: 5,
          memo: '理解度向上'
        }),
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.understanding).toBe(5);
    });

    it('should handle non-existent study log', async () => {
      // Arrange
      mockPrisma.studyLog.findUnique.mockResolvedValue(null);

      // Act
      const response = await app.request('/api/studylog/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          understanding: 5
        }),
      });

      // Assert
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/studylog/:id', () => {
    it('should delete study log successfully', async () => {
      // Arrange
      mockPrisma.studyLog.findUnique.mockResolvedValue(mockStudyLog);
      mockPrisma.studyLog.delete.mockResolvedValue(mockStudyLog);

      // Act
      const response = await app.request('/api/studylog/1', {
        method: 'DELETE'
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('削除');
    });
  });

  describe('GET /api/studylog/analytics/:userId', () => {
    it('should return study analytics', async () => {
      // Arrange
      const analyticsData = [
        { studyDate: new Date('2024-01-15'), studyTime: 120, understanding: 4 },
        { studyDate: new Date('2024-01-16'), studyTime: 90, understanding: 3 }
      ];
      mockPrisma.studyLog.findMany.mockResolvedValue(analyticsData);

      // Act
      const response = await app.request('/api/studylog/analytics/1?period=week');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.analytics).toBeDefined();
      expect(data.data.totalStudyTime).toBe(210); // 120 + 90
      expect(data.data.averageUnderstanding).toBeCloseTo(3.5); // (4 + 3) / 2
    });
  });
});