// TDD Tests for Authentication System
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import authRoutes from '../infrastructure/web/routes/auth';
import { authMiddleware, getAuthUser } from '../infrastructure/web/middleware/auth';

// Mock PrismaClient
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock @prisma/client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

describe('Authentication System (TDD)', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/auth', authRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const newUser = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        email: newUser.email,
        name: newUser.name,
      });

      // Act
      const response = await app.request('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.email).toBe(newUser.email);
      expect(data.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject registration with invalid email', async () => {
      // Arrange
      const invalidUser = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      };

      // Act
      const response = await app.request('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUser),
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      // Arrange
      const weakPasswordUser = {
        email: 'test@example.com',
        password: '123', // Too short
        name: 'Test User',
      };

      // Act
      const response = await app.request('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weakPasswordUser),
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should reject registration for existing user', async () => {
      // Arrange
      const existingUser = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // User exists

      // Act
      const response = await app.request('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingUser),
      });

      // Assert
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('already exists');
    });
  });

  describe('User Login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.email).toBe(loginData.email);
      expect(data.data.user.password).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      // Arrange
      const invalidLogin = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // User not found

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidLogin),
      });

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      // Arrange
      const invalidLogin = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidLogin),
      });

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid email or password');
    });
  });

  describe('JWT Token Handling', () => {
    it('should generate valid JWT token on login', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      const token = data.data.token;
      
      // Verify token structure
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      
      // Verify token content
      const payload = await verify(token, 'development-secret-key');
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should validate JWT token correctly', async () => {
      // Arrange
      const payload = {
        sub: mockUser.id,
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      };

      const token = await sign(payload, 'development-secret-key');

      // Act: Create a protected route for testing
      const testApp = new Hono();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => {
        const user = getAuthUser(c);
        return c.json({ success: true, user });
      });

      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.userId).toBe(mockUser.id);
    });

    it('should reject invalid JWT token', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      // Act
      const testApp = new Hono();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => c.json({ success: true }));

      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
        },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should handle expired JWT token', async () => {
      // Arrange: Create expired token
      const expiredPayload = {
        sub: mockUser.id,
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      };

      const expiredToken = await sign(expiredPayload, 'development-secret-key');

      // Act
      const testApp = new Hono();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => c.json({ success: true }));

      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Development Environment Fallbacks', () => {
    it('should allow X-User-ID header in development', async () => {
      // Arrange
      const testApp = new Hono();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => {
        const user = c.get('authUser');
        return c.json({ success: true, user });
      });

      // Act
      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'X-User-ID': 'dev-user-123',
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.userId).toBe('dev-user-123');
    });

    it('should allow anonymous users in development', async () => {
      // Arrange
      const testApp = new Hono();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => {
        const user = c.get('authUser');
        return c.json({ success: true, user });
      });

      // Act: Request without any auth headers
      const response = await testApp.request('/protected', {
        method: 'GET',
      });

      // Assert: Should work in development mode
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.userId).toBe('anonymous');
    });
  });

  describe('Test User Creation (Development)', () => {
    it('should create test user in development environment', async () => {
      // Arrange
      mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 });
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-test-password');
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
        name: 'Test User',
      });

      // Act
      const response = await app.request('/auth/dev/create-test-user', {
        method: 'POST',
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('test@example.com');
      expect(data.data.credentials.password).toBe('test1234');
    });
  });
});