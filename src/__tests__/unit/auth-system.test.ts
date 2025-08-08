// TDD Tests for Authentication System
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { authMiddleware, getAuthUser, type Variables } from '../../infrastructure/web/middleware/auth';

// Create mock functions that will be reused
const mockUserMethods = {
  findUnique: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
};

// Mock @prisma/client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: mockUserMethods,
  })),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Dynamic import for routes to ensure mocks are in place
let authRoutes: any;

// Mock data
const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Authentication System (TDD)', () => {
  let app: Hono;

  beforeEach(async () => {
    // Set environment to development for fallback tests
    process.env.NODE_ENV = 'development';
    
    // Clear mocks first
    vi.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    authRoutes = (await import('../../infrastructure/web/routes/auth')).default;
    
    app = new Hono();
    app.route('/auth', authRoutes);
    
    // Set default mock return values
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
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

      mockUserMethods.findUnique.mockResolvedValue(null); // User doesn't exist
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      mockUserMethods.create.mockResolvedValue({
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

      mockUserMethods.findUnique.mockResolvedValue(mockUser); // User exists

      // Act
      const response = await app.request('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingUser),
      });

      // Assert
      expect(response.status).toBe(409);
      // Handle text or JSON response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('already exists');
      } else {
        const textData = await response.text();
        expect(textData).toContain('already exists');
      }
    });
  });

  describe('User Login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserMethods.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

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

      mockUserMethods.findUnique.mockResolvedValue(null); // User not found

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidLogin),
      });

      // Assert
      expect(response.status).toBe(401);
      // Handle text or JSON response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Invalid email or password');
      } else {
        const textData = await response.text();
        expect(textData).toContain('Invalid email or password');
      }
    });

    it('should reject login with invalid password', async () => {
      // Arrange
      const invalidLogin = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserMethods.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidLogin),
      });

      // Assert
      expect(response.status).toBe(401);
      // Handle text or JSON response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Invalid email or password');
      } else {
        const textData = await response.text();
        expect(textData).toContain('Invalid email or password');
      }
    });
  });

  describe('JWT Token Handling', () => {
    it('should generate valid JWT token on login', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserMethods.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

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
      expect(payload.sub || payload.userId).toBe(mockUser.id);
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
      const testApp = new Hono<{ Variables: Variables }>();
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
      // The authMiddleware should return the userId as integer
      expect(data.user.userId).toBe(mockUser.id);
    });

    it('should reject invalid JWT token', async () => {
      // Arrange
      const invalidToken = 'invalid-test-token';
      
      // Temporarily set to production environment to avoid development fallback
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Act
      const testApp = new Hono<{ Variables: Variables }>();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => c.json({ success: true }));

      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
        },
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;

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
      
      // Temporarily set to production environment to avoid development fallback
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Act
      const testApp = new Hono<{ Variables: Variables }>();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => c.json({ success: true }));

      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Development Environment Fallbacks', () => {
    it('should allow X-User-ID header in development', async () => {
      // Arrange
      const testApp = new Hono<{ Variables: Variables }>();
      testApp.use('/protected', authMiddleware);
      testApp.get('/protected', (c) => {
        const user = c.get('authUser');
        return c.json({ success: true, user });
      });

      // Act
      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'X-User-ID': '123',
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.userId).toBe(123); // Should be parsed as integer
    });

    it('should allow anonymous users in development', async () => {
      // Arrange
      const testApp = new Hono<{ Variables: Variables }>();
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
      expect(data.user.userId).toBe(0); // Anonymous user has userId 0
    });
  });

  describe('Test User Creation (Development)', () => {
    it('should create test user in development environment', async () => {
      // Arrange
      mockUserMethods.deleteMany.mockResolvedValue({ count: 0 });
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-test-password' as never);
      mockUserMethods.create.mockResolvedValue({
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
      expect(data.data.credentials.password).toBeDefined();
    });
  });
});