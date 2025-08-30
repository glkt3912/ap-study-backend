import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';

// Mock modules at the top level BEFORE imports
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-refresh-token-123'),
    }),
  },
}));

import { PrismaClient } from '@prisma/client';
import authRoutes from '../../infrastructure/web/routes/auth';

// Access mock after import
const mockPrisma = (new PrismaClient() as any);

describe('Auth API Integration Tests', () => {
  let app: Hono;
  
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    password: 'hashedpassword',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshToken: null,
    refreshTokenExp: null,
  };

  beforeEach(() => {
    app = new Hono();
    app.route('/api/auth', authRoutes);
    vi.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should create new user successfully', async () => {
      // Arrange
      (bcrypt.hash as any).mockResolvedValue('hashedpassword');
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'mock-refresh-token-123'
      });

      // Act
      const response = await app.request('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'testpassword123',
          name: 'Test User'
        }),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('test@example.com');
      expect(data.data.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // Existing user

      // Act
      const response = await app.request('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'newuser',
          password: 'testpassword123'
        }),
      });

      // Assert
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should validate required fields', async () => {
      // Act
      const response = await app.request('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'short'
        }),
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'mock-refresh-token-123'
      });

      // Act
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: 'test@example.com',
          password: 'testpassword123'
        }),
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('test@example.com');
      expect(data.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false); // Wrong password

      // Act
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: 'test@example.com',
          password: 'wrongpassword'
        }),
      });

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Arrange
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: 'valid-refresh-token',
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days later
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithRefreshToken);
      mockPrisma.user.update.mockResolvedValue(userWithRefreshToken);

      // Act
      const response = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'refresh_token=valid-refresh-token'
        },
        body: JSON.stringify({
          refreshToken: 'valid-refresh-token'
        }),
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
    });

    it('should reject expired refresh token', async () => {
      // Arrange
      const userWithExpiredToken = {
        ...mockUser,
        refreshToken: 'expired-token',
        refreshTokenExp: new Date(Date.now() - 1000) // 1 second ago (expired)
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithExpiredToken);

      // Act
      const response = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'expired-token'
        }),
      });

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});