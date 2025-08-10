import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../app';

describe('Exam Config Integration Tests', () => {
  let prisma: PrismaClient;
  let app: any;
  let testUserId: number;

  beforeAll(async () => {
    // Initialize test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db',
        },
      },
    });

    // Create test app instance
    app = createApp();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-exam-config@example.com',
        name: 'Test User',
        password: 'hashed_password',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.examConfig.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean exam configs before each test
    await prisma.examConfig.deleteMany({
      where: { userId: testUserId },
    });
  });

  describe('Complete Exam Config Workflow', () => {
    it('should handle complete CRUD operations', async () => {
      // 1. GET non-existent config (should return 404)
      const getResponse1 = await app.request(`/api/exam-config/${testUserId}`);
      expect(getResponse1.status).toBe(404);

      // 2. CREATE new config
      const createData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 85,
      };

      const createResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      expect(createResponse.status).toBe(200);
      const createdConfig = await createResponse.json();
      expect(createdConfig).toMatchObject({
        userId: testUserId,
        examDate: expect.any(String),
        targetScore: 85,
      });
      expect(createdConfig.remainingDays).toBeDefined();
      expect(typeof createdConfig.remainingDays).toBe('number');

      // 3. GET existing config
      const getResponse2 = await app.request(`/api/exam-config/${testUserId}`);
      expect(getResponse2.status).toBe(200);
      const retrievedConfig = await getResponse2.json();
      expect(retrievedConfig.id).toBe(createdConfig.id);
      expect(retrievedConfig.targetScore).toBe(85);

      // 4. UPDATE existing config
      const updateData = {
        examDate: '2024-12-15T00:00:00Z',
        targetScore: 90,
      };

      const updateResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(updateResponse.status).toBe(200);
      const updatedConfig = await updateResponse.json();
      expect(updatedConfig.id).toBe(createdConfig.id); // Same ID
      expect(updatedConfig.targetScore).toBe(90);

      // 5. Verify update persisted
      const getResponse3 = await app.request(`/api/exam-config/${testUserId}`);
      const verifyConfig = await getResponse3.json();
      expect(verifyConfig.targetScore).toBe(90);

      // 6. DELETE config
      const deleteResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(200);
      const deleteResult = await deleteResponse.json();
      expect(deleteResult.message).toBe('Exam configuration deleted successfully');

      // 7. Verify deletion
      const getResponse4 = await app.request(`/api/exam-config/${testUserId}`);
      expect(getResponse4.status).toBe(404);
    });

    it('should handle remaining days calculation correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const createData = {
        examDate: futureDate.toISOString(),
        targetScore: 80,
      };

      const createResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      const config = await createResponse.json();
      expect(config.remainingDays).toBeGreaterThanOrEqual(29);
      expect(config.remainingDays).toBeLessThanOrEqual(31);
    });

    it('should handle past exam dates correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const createData = {
        examDate: pastDate.toISOString(),
        targetScore: 75,
      };

      const createResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      const config = await createResponse.json();
      expect(config.remainingDays).toBeLessThanOrEqual(-9);
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should validate exam date format', async () => {
      const invalidData = {
        examDate: 'invalid-date-format',
        targetScore: 80,
      };

      const response = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('Validation error');
      expect(error.details).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        targetScore: 80,
        // missing examDate
      };

      const response = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteData),
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid user ID formats', async () => {
      const response = await app.request('/api/exam-config/not-a-number', {
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

    it('should handle non-existent user operations gracefully', async () => {
      const nonExistentUserId = 99999;

      const createData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 80,
      };

      const response = await app.request(`/api/exam-config/${nonExistentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      // Should fail due to foreign key constraint
      expect(response.status).toBe(500);
    });
  });

  describe('Optional Fields Handling', () => {
    it('should create config without target score', async () => {
      const minimalData = {
        examDate: '2024-12-01T00:00:00Z',
      };

      const response = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalData),
      });

      expect(response.status).toBe(200);
      const config = await response.json();
      expect(config.examDate).toBeDefined();
      expect(config.targetScore).toBeNull();
    });

    it('should update only specific fields', async () => {
      // Create initial config
      const initialData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 80,
      };

      await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData),
      });

      // Update only target score
      const partialUpdate = {
        targetScore: 90,
      };

      const updateResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialUpdate),
      });

      expect(updateResponse.status).toBe(200);
      const updatedConfig = await updateResponse.json();
      expect(updatedConfig.targetScore).toBe(90);
      expect(new Date(updatedConfig.examDate)).toEqual(new Date('2024-12-01T00:00:00Z'));
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent updates correctly', async () => {
      // Create initial config
      const initialData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 80,
      };

      await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData),
      });

      // Simulate concurrent updates
      const update1 = app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetScore: 85 }),
      });

      const update2 = app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetScore: 90 }),
      });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed (last write wins)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify final state
      const finalResponse = await app.request(`/api/exam-config/${testUserId}`);
      const finalConfig = await finalResponse.json();
      expect([85, 90]).toContain(finalConfig.targetScore);
    });
  });

  describe('Database Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create config
      const createData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 80,
      };

      const createResponse = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      const config = await createResponse.json();

      // Verify in database
      const dbConfig = await prisma.examConfig.findUnique({
        where: { id: config.id },
        include: { user: true },
      });

      expect(dbConfig).toBeDefined();
      expect(dbConfig!.userId).toBe(testUserId);
      expect(dbConfig!.user.email).toBe('test-exam-config@example.com');
    });

    it('should enforce unique constraint per user', async () => {
      const configData = {
        examDate: '2024-12-01T00:00:00Z',
        targetScore: 80,
      };

      // Create first config
      const response1 = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });
      expect(response1.status).toBe(200);

      // Attempt to create second config (should update instead)
      const response2 = await app.request(`/api/exam-config/${testUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...configData, targetScore: 90 }),
      });
      expect(response2.status).toBe(200);

      // Verify only one config exists
      const configs = await prisma.examConfig.findMany({
        where: { userId: testUserId },
      });
      expect(configs).toHaveLength(1);
      expect(configs[0].targetScore).toBe(90);
    });
  });
});