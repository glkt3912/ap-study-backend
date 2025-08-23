import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';

// Create mock at module level
const mockPrisma = {
  examConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

// Mock modules at the top level
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

import { PrismaClient } from '@prisma/client';
import examConfigRoutes from '../../infrastructure/web/routes/exam-config';

describe('Exam Config API', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', examConfigRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /exam-config/:userId', () => {
    it('should return exam config with remaining days', async () => {
      const mockExamConfig = {
        id: 1,
        userId: 1,
        examDate: new Date('2024-12-01T00:00:00Z'),
        targetScore: 80,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(mockExamConfig);

      const response = await app.request('/exam-config/1');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toMatchObject({
        id: 1,
        userId: 1,
        examDate: mockExamConfig.examDate,
        targetScore: 80,
      });
      expect(result).toHaveProperty('remainingDays');
      expect(typeof result.remainingDays).toBe('number');
    });

    it('should return 404 when exam config not found', async () => {
      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(null);

      const response = await app.request('/exam-config/999');
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('Exam configuration not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await app.request('/exam-config/invalid');
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid user ID');
    });
  });

  describe('POST /exam-config/:userId', () => {
    it('should create new exam config', async () => {
      const requestData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 85,
      };

      const mockCreatedConfig = {
        id: 1,
        userId: 1,
        examDate: new Date(requestData.examDate),
        targetScore: requestData.targetScore,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.examConfig.create = vi.fn().mockResolvedValue(mockCreatedConfig);

      const response = await app.request('/exam-config/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toMatchObject({
        id: 1,
        userId: 1,
        targetScore: 85,
      });
      expect(result).toHaveProperty('remainingDays');
      expect(mockPrisma.examConfig.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          examDate: expect.any(Date),
          targetScore: 85,
        },
      });
    });

    it('should update existing exam config', async () => {
      const requestData = {
        examDate: '2024-12-15T00:00:00Z',
        targetScore: 90,
      };

      const existingConfig = {
        id: 1,
        userId: 1,
        examDate: new Date('2024-12-01T00:00:00Z'),
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedConfig = {
        ...existingConfig,
        examDate: new Date(requestData.examDate),
        targetScore: requestData.targetScore,
        updatedAt: new Date(),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(existingConfig);
      mockPrisma.examConfig.update = vi.fn().mockResolvedValue(updatedConfig);

      const response = await app.request('/exam-config/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.targetScore).toBe(90);
      expect(mockPrisma.examConfig.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: {
          examDate: expect.any(Date),
          targetScore: 90,
        },
      });
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        examDate: 'invalid-date',
        targetScore: 'not-a-number',
      };

      const response = await app.request('/exam-config/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Validation error');
      expect(result).toHaveProperty('details');
    });

    it('should handle missing targetScore', async () => {
      const requestData = {
        examDate: '2024-12-01T00:00:00Z',
      };

      const mockCreatedConfig = {
        id: 1,
        userId: 1,
        examDate: new Date(requestData.examDate),
        targetScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.examConfig.create = vi.fn().mockResolvedValue(mockCreatedConfig);

      const response = await app.request('/exam-config/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.targetScore).toBeNull();
    });
  });

  describe('DELETE /exam-config/:userId', () => {
    it('should delete exam config successfully', async () => {
      mockPrisma.examConfig.delete = vi.fn().mockResolvedValue({
        id: 1,
        userId: 1,
        examDate: new Date(),
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await app.request('/exam-config/1', {
        method: 'DELETE',
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Exam configuration deleted successfully');
      expect(mockPrisma.examConfig.delete).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await app.request('/exam-config/invalid', {
        method: 'DELETE',
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid user ID');
    });

    it('should handle database errors', async () => {
      mockPrisma.examConfig.delete = vi.fn().mockRejectedValue(new Error('Database error'));

      const response = await app.request('/exam-config/1', {
        method: 'DELETE',
      });

      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Remaining days calculation', () => {
    it('should calculate positive remaining days correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future

      const mockExamConfig = {
        id: 1,
        userId: 1,
        examDate: futureDate,
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(mockExamConfig);

      const response = await app.request('/exam-config/1');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.remainingDays).toBeGreaterThanOrEqual(29);
      expect(result.remainingDays).toBeLessThanOrEqual(31);
    });

    it('should calculate negative remaining days for past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      const mockExamConfig = {
        id: 1,
        userId: 1,
        examDate: pastDate,
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(mockExamConfig);

      const response = await app.request('/exam-config/1');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.remainingDays).toBeLessThanOrEqual(-9);
      expect(result.remainingDays).toBeGreaterThanOrEqual(-11);
    });
  });
});