import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('Exam Config Integration Tests', () => {
  let app: Hono;
  const testUserId = 1;

  beforeEach(() => {
    app = new Hono();
    app.route('/', examConfigRoutes);
    vi.clearAllMocks();
  });

  describe('API Integration', () => {
    it('should handle CRUD workflow with proper status codes', async () => {
      // Mock non-existent config
      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(null);
      
      const getResponse = await app.request(`/exam-config/${testUserId}`);
      expect(getResponse.status).toBe(404);

      // Mock successful creation
      const mockCreated = {
        id: 1,
        userId: testUserId,
        examDate: new Date('2024-12-01T00:00:00Z'),
        targetScore: 85,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPrisma.examConfig.create = vi.fn().mockResolvedValue(mockCreated);
      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValueOnce(null);

      const createData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 85,
      };

      const createResponse = await app.request(`/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      expect(createResponse.status).toBe(200);
      const result = await createResponse.json();
      expect(result).toHaveProperty('remainingDays');
      expect(result.targetScore).toBe(85);
    });

    it('should validate request data', async () => {
      const invalidData = {
        examDate: 'invalid-date',
        targetScore: 85,
      };

      const response = await app.request(`/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('Validation error');
    });

    it('should handle update operations', async () => {
      const existing = {
        id: 1,
        userId: testUserId,
        examDate: new Date('2024-12-01T00:00:00Z'),
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = { ...existing, targetScore: 90 };
      
      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(existing);
      mockPrisma.examConfig.update = vi.fn().mockResolvedValue(updated);

      const updateData = { targetScore: 90 };
      const response = await app.request(`/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.targetScore).toBe(90);
    });

    it('should handle delete operations', async () => {
      mockPrisma.examConfig.delete = vi.fn().mockResolvedValue({
        id: 1,
        userId: testUserId,
        examDate: new Date(),
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await app.request(`/exam-config/${testUserId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.message).toBe('Exam configuration deleted successfully');
    });

    it('should calculate remaining days correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockConfig = {
        id: 1,
        userId: testUserId,
        examDate: futureDate,
        targetScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.examConfig.findUnique = vi.fn().mockResolvedValue(mockConfig);

      const response = await app.request(`/exam-config/${testUserId}`);
      const result = await response.json();

      expect(result.remainingDays).toBeGreaterThanOrEqual(29);
      expect(result.remainingDays).toBeLessThanOrEqual(31);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user IDs', async () => {
      const response = await app.request('/exam-config/invalid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: '2024-12-01T00:00:00Z',
          targetScore: 80,
        }),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('Invalid user ID');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.examConfig.findUnique = vi.fn().mockRejectedValue(new Error('Database error'));

      const response = await app.request(`/exam-config/${testUserId}`);
      expect(response.status).toBe(500);
    });
  });
});