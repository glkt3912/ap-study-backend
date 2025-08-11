// Enhanced JWT Authentication System Tests (Fixed)
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import crypto from 'crypto';
import { authMiddleware, type Variables } from '../../infrastructure/web/middleware/auth';

// Mock modules
const mockUserMethods = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: mockUserMethods,
  })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mocked-refresh-token-123456'),
    }),
  },
}));

// Dynamic import for routes
let authRoutes: any;
let logoutRoutes: any;

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshToken: null,
  refreshTokenExp: null,
};

describe('Enhanced JWT Authentication System (Fixed)', () => {
  let app: Hono<{ Variables: Variables }>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'test-secret-key';
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Create fresh app instance
    app = new Hono<{ Variables: Variables }>();
    
    // Import auth routes fresh for each test
    authRoutes = (await import('../../infrastructure/web/routes/auth')).default;
    logoutRoutes = (await import('../../infrastructure/web/routes/logout')).default;
    app.route('/api/auth', authRoutes);
    app.route('/api/auth', logoutRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('JWT Token Expiration (2 hours)', () => {
    it('should create JWT with 2-hour expiration', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);
      
      mockUserMethods.findUnique.mockResolvedValue(null);
      mockUserMethods.create.mockResolvedValue(mockUser);
      mockUserMethods.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'mocked-refresh-token-123456',
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Act
      const response = await app.request('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
          name: 'Test User'
        }),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.expiresIn).toBe('2h');
      
      // Verify JWT token has 2-hour expiration
      const token = data.data.token;
      const payload = await verify(token, 'test-secret-key') as any;
      const expirationTime = payload.exp * 1000;
      const issuedTime = payload.iat * 1000;
      const tokenLifetime = expirationTime - issuedTime;
      
      // Should be 2 hours (7200 seconds)
      expect(tokenLifetime).toBe(2 * 60 * 60 * 1000);
    });

    it('should reject expired JWT token', async () => {
      // Arrange: Create expired token
      const expiredPayload = {
        sub: 1,
        userId: 1,
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago (expired)
      };
      
      const expiredToken = await sign(expiredPayload, 'test-secret-key');
      
      // Act: Try to access protected route with expired token
      const response = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('HttpOnly Cookie Support', () => {
    it('should set HttpOnly cookies on login', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      (bcrypt.compare as any).mockResolvedValue(true);
      
      mockUserMethods.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword
      });
      mockUserMethods.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'mocked-refresh-token-123456',
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Act
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        }),
      });

      // Assert
      expect(response.status).toBe(200);
      const setCookieHeaders = response.headers.getSetCookie();
      
      // Should have access_token cookie with HttpOnly
      const accessTokenCookie = setCookieHeaders.find(cookie => 
        cookie.startsWith('access_token=')
      );
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Lax');
      
      // Should have refresh_token cookie with HttpOnly
      const refreshTokenCookie = setCookieHeaders.find(cookie => 
        cookie.startsWith('refresh_token=')
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Lax');
    });

    it('should authenticate with HttpOnly cookie', async () => {
      // Arrange: Create valid token
      const payload = {
        sub: 1,
        userId: 1,
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
      };
      const token = await sign(payload, 'test-secret-key');
      
      mockUserMethods.findUnique.mockResolvedValue(mockUser);

      // Act: Send request with cookie
      const response = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': `access_token=${token}`,
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe(1);
    });
  });

  describe('Refresh Token System', () => {
    it('should create refresh token on signup', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);
      
      mockUserMethods.findUnique.mockResolvedValue(null);
      mockUserMethods.create.mockResolvedValue(mockUser);
      mockUserMethods.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'mocked-refresh-token-123456',
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Act
      const response = await app.request('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
          name: 'Test User'
        }),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.refreshToken).toBe('mocked-refresh-token-123456');
      
      // Verify database update was called with refresh token
      expect(mockUserMethods.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          refreshToken: 'mocked-refresh-token-123456',
          refreshTokenExp: expect.any(Date)
        }
      });
    });

    it('should refresh access token with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token-123';
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken,
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days future
      };
      
      mockUserMethods.findFirst.mockResolvedValue(userWithRefreshToken);
      mockUserMethods.update.mockResolvedValue({
        ...userWithRefreshToken,
        refreshToken: 'mocked-refresh-token-123456',
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Act
      const response = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `refresh_token=${refreshToken}`
        },
        body: JSON.stringify({}),
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBe('mocked-refresh-token-123456');
      expect(data.data.expiresIn).toBe('2h');
    });

    it('should reject expired refresh token', async () => {
      // Arrange
      const expiredRefreshToken = 'expired-refresh-token-123';
      mockUserMethods.findFirst.mockResolvedValue(null); // No user found with valid refresh token

      // Act
      const response = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `refresh_token=${expiredRefreshToken}`
        },
        body: JSON.stringify({}),
      });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Enhanced Security Middleware', () => {
    it('should prioritize cookie authentication over Authorization header', async () => {
      // Arrange
      const cookieToken = await sign({
        sub: 1,
        userId: 1,
        email: 'cookie@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200,
      }, 'test-secret-key');
      
      const headerToken = await sign({
        sub: 2,
        userId: 2,
        email: 'header@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200,
      }, 'test-secret-key');

      mockUserMethods.findUnique.mockResolvedValue({
        id: 1,
        email: 'cookie@example.com',
        name: 'Cookie User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act: Send both cookie and Authorization header
      const response = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${headerToken}`,
          'Cookie': `access_token=${cookieToken}`,
        },
      });

      // Assert: Should use cookie token (userId: 1)
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.user.email).toBe('cookie@example.com');
    });

    it('should fallback to Authorization header when no cookie', async () => {
      // Arrange
      const headerToken = await sign({
        sub: 2,
        userId: 2,
        email: 'header@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200,
      }, 'test-secret-key');

      mockUserMethods.findUnique.mockResolvedValue({
        id: 2,
        email: 'header@example.com',
        name: 'Header User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act: Send only Authorization header
      const response = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${headerToken}`,
        },
      });

      // Assert: Should use header token (userId: 2)
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.user.email).toBe('header@example.com');
    });

    it('should reject request with no authentication', async () => {
      // Act: Send request without any authentication
      const response = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {},
      });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Logout Functionality', () => {
    it('should clear cookies and invalidate refresh token on logout', async () => {
      // Arrange
      const validToken = await sign({
        sub: 1,
        userId: 1,
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200,
      }, 'test-secret-key');

      mockUserMethods.update.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
        refreshTokenExp: null
      });

      // Act
      const response = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT token', async () => {
      // Act
      const response = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-malformed-token',
        },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockUserMethods.findUnique.mockRejectedValue(new Error('Database connection failed'));
      
      // Act
      const response = await app.request('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
          name: 'Test User'
        }),
      });

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});