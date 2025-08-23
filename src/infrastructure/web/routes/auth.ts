import { Hono } from 'hono';
import type { Variables } from '../middleware/auth';
import { sign, verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth.js';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import crypto from 'crypto';

// バリデーションスキーマ
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore and dash'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

const app = new Hono<{ Variables: Variables }>();
const prisma = new PrismaClient();

// Local helper functions for token handling
const extractTokenFromRequest = (c: any): string | null => {
  // 1. HttpOnly Cookieからトークン取得 (優先)
  const cookieToken = getCookie(c, 'access_token');
  if (cookieToken) {
    return cookieToken;
  }

  // 2. Authorization ヘッダーからJWTトークンを取得 (フォールバック)
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

const verifyJWTToken = async (token: string, secret: string) => {
  try {
    return await verify(token, secret);
  } catch {
    throw new HTTPException(401, {
      message: 'Invalid or expired authentication token'
    });
  }
};

// Helper functions for auth routes
const checkExistingUser = async (email: string, username: string) => {
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail) {
    throw new HTTPException(409, {
      message: JSON.stringify({
        success: false,
        error: 'このメールアドレスは既に使用されています',
        errorCode: 'USER_ALREADY_EXISTS',
        message: 'User already exists with this email',
      })
    });
  }

  const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUserByUsername) {
    throw new HTTPException(409, {
      message: JSON.stringify({
        success: false,
        error: 'このユーザー名は既に使用されています',
        errorCode: 'USERNAME_ALREADY_EXISTS',
        message: 'User already exists with this username',
      })
    });
  }
};

const createUserWithHashedPassword = async (email: string, username: string, password: string, name?: string) => {
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  return await prisma.user.create({
    data: {
      email,
      username,
      name: name || username,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      createdAt: true,
    },
  });
};

const generateTokenPair = async (userId: number, email: string, username: string) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
  const REFRESH_SECRET = process.env.REFRESH_SECRET || 'development-refresh-secret';

  const accessToken = await sign(
    {
      sub: userId.toString(),
      email,
      username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1時間
    },
    JWT_SECRET
  );

  const refreshToken = await sign(
    {
      sub: userId.toString(),
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30日
    },
    REFRESH_SECRET
  );

  return { accessToken, refreshToken };
};

const setAuthCookies = (c: any, accessToken: string, refreshToken: string) => {
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1時間
    path: '/',
  });

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30日
    path: '/',
  });
};

const handleAuthError = (c: any, error: unknown, defaultMessage: string) => {
  if (error instanceof HTTPException) {
    const parsedMessage = JSON.parse(error.message);
    return c.json(parsedMessage, error.status);
  }
  
  return c.json({
    success: false,
    error: error instanceof Error ? error.message : defaultMessage,
  }, 500);
};

/**
 * ユーザー登録
 */
app.post('/signup', zValidator('json', signupSchema), async c => {
  try {
    const { email, username, password, name } = c.req.valid('json');

    await checkExistingUser(email, username);
    const user = await createUserWithHashedPassword(email, username, password, name);
    const { accessToken, refreshToken } = await generateTokenPair(user.id, user.email, user.username);
    
    setAuthCookies(c, accessToken, refreshToken);

    // リフレッシュトークンをDBに保存
    const refreshTokenExp = new Date();
    refreshTokenExp.setDate(refreshTokenExp.getDate() + 30);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, refreshTokenExp },
    });

    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        token: accessToken,
        user,
        expiresIn: '1h',
        refreshToken,
      },
    }, 201);
  } catch (error) {
    return handleAuthError(c, error, 'ユーザー登録に失敗しました');
  }
});

// Helper functions for login endpoint
const findUserByEmailOrUsername = async (emailOrUsername: string) => {
  const isEmail = emailOrUsername.includes('@');
  return await prisma.user.findUnique({
    where: isEmail ? { email: emailOrUsername } : { username: emailOrUsername },
  });
};

const createInvalidCredentialsResponse = (c: any) => {
  return c.json(
    {
      success: false,
      error: 'メールアドレス/ユーザー名またはパスワードが正しくありません',
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Invalid email/username or password',
    },
    401,
  );
};

const generateJWTAndRefreshToken = async (user: any) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
  const payload = {
    sub: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2時間有効
  };

  const token = await sign(payload, JWT_SECRET);
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshTokenExp = new Date();
  refreshTokenExp.setDate(refreshTokenExp.getDate() + 7);

  return { token, refreshToken, refreshTokenExp };
};

const setLoginCookies = (c: any, token: string, refreshToken: string) => {
  setCookie(c, 'access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 2 * 60 * 60, // 2時間
  });

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7日間
  });
};

/**
 * ユーザーログイン
 */
app.post('/login', zValidator('json', loginSchema), async c => {
  try {
    const { emailOrUsername, password } = c.req.valid('json');

    const user = await findUserByEmailOrUsername(emailOrUsername);
    if (!user) {
      return createInvalidCredentialsResponse(c);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return createInvalidCredentialsResponse(c);
    }

    const { token, refreshToken, refreshTokenExp } = await generateJWTAndRefreshToken(user);

    // リフレッシュトークンをDBに保存
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, refreshTokenExp },
    });

    setLoginCookies(c, token, refreshToken);

    // レスポンスからパスワードを除外
    const { password: _pwd, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userWithoutPassword,
        expiresIn: '2h',
        refreshToken,
      },
    });
  } catch (error) {
    return handleAuthError(c, error, '内部サーバーエラーが発生しました');
  }
});

// Helper function for /me endpoint
const getUserFromToken = async (token: string) => {
  const secret = process.env.JWT_SECRET || 'development-secret-key';
  const payload = await verifyJWTToken(token, secret);
  const userId = parseInt(String(payload.sub || payload.userId || '0'));

  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const createAnonymousResponse = (c: any) => {
  return c.json({
    success: true,
    data: { user: null },
  });
};

/**
 * ユーザー情報取得（要認証）
 */
app.get('/me', async c => {
  try {
    const token = extractTokenFromRequest(c);

    if (!token) {
      return createAnonymousResponse(c);
    }

    try {
      const user = await getUserFromToken(token);
      
      if (!user) {
        return createAnonymousResponse(c);
      }

      return c.json({
        success: true,
        data: { user },
      });
    } catch {
      // JWT検証失敗時は匿名ユーザーとして扱う
      return createAnonymousResponse(c);
    }
  } catch (error) {
    return handleAuthError(c, error, 'Internal server error');
  }
});

// Helper functions for refresh endpoint
const getRefreshTokenFromRequest = (c: any) => {
  // Cookieからリフレッシュトークン取得 (優先)
  let refreshTokenFromCookie = null;
  try {
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});
      refreshTokenFromCookie = cookies['refresh_token'];
    }
  } catch {
    // Cookie parsing failed, continue with body fallback
  }

  // リクエストボディからリフレッシュトークン取得 (フォールバック)
  const validatedBody = c.req.valid('json');
  return refreshTokenFromCookie || validatedBody.refreshToken;
};

const validateRefreshToken = async (refreshToken: string) => {
  return await prisma.user.findFirst({
    where: {
      refreshToken,
      refreshTokenExp: {
        gt: new Date(), // 有効期限内
      },
    },
  });
};

const generateNewTokens = async (user: any) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
  const payload = {
    sub: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2時間有効
  };

  const newToken = await sign(payload, JWT_SECRET);
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  const newRefreshTokenExp = new Date();
  newRefreshTokenExp.setDate(newRefreshTokenExp.getDate() + 7);

  return { newToken, newRefreshToken, newRefreshTokenExp };
};

const setRefreshCookies = (c: any, newToken: string, newRefreshToken: string) => {
  setCookie(c, 'access_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 2 * 60 * 60, // 2時間
  });

  setCookie(c, 'refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7日間
  });
};

/**
 * リフレッシュトークンベースのトークン更新
 */
app.post('/refresh', zValidator('json', refreshSchema), async c => {
  try {
    const refreshToken = getRefreshTokenFromRequest(c);

    if (!refreshToken) {
      throw new HTTPException(401, {
        message: 'Refresh token required',
      });
    }

    const user = await validateRefreshToken(refreshToken);
    if (!user) {
      throw new HTTPException(401, {
        message: 'Invalid or expired refresh token',
      });
    }

    const { newToken, newRefreshToken, newRefreshTokenExp } = await generateNewTokens(user);

    // リフレッシュトークンをDBに更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExp: newRefreshTokenExp,
      },
    });

    setRefreshCookies(c, newToken, newRefreshToken);

    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: '2h',
      },
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, {
      message: 'Internal server error during token refresh',
    });
  }
});

/**
 * 開発環境用：テストユーザー作成
 */
if (process.env.NODE_ENV === 'development') {
  app.post('/dev/create-test-user', async c => {
    try {
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'development-test-password';

      // 既存テストユーザーを削除
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });

      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(testPassword, 12);

      // テストユーザー作成
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          username: `testuser_${Date.now()}`, // ユニークなユーザー名生成
          password: hashedPassword,
          name: 'Test User',
          role: 'user',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      return c.json({
        success: true,
        message: 'Test user created successfully',
        data: {
          user,
          credentials: {
            email: testEmail,
            password: testPassword,
          },
        },
      });
    } catch (error) {
      throw new HTTPException(500, { message: 'Failed to create test user' });
    }
  });
}

/**
 * 開発環境用の簡易ログイン
 * メールアドレスまたはユーザーIDでJWTトークンを即座に生成
 */
// 開発環境でのみ有効
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
  const devLoginSchema = z
    .object({
      email: z.string().email().optional(),
      userId: z.number().optional(),
      username: z.string().optional(),
    })
    .refine(data => data.email || data.userId || data.username, {
      message: 'email, userId, or username is required',
    });

  app.post('/dev-login', zValidator('json', devLoginSchema), async c => {
    try {
      const { email, userId, username } = c.req.valid('json');
      const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

      // ユーザーを検索
      let user = null;
      if (userId) {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } else if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      } else if (username) {
        user = await prisma.user.findUnique({ where: { username } });
      }

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'User not found',
            errorCode: 'USER_NOT_FOUND',
          },
          404,
        );
      }

      // JWTトークン生成
      const payload = {
        sub: user.id.toString(),
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2時間有効
      };

      const token = await sign(payload, JWT_SECRET);

      return c.json({
        success: true,
        message: 'Development login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
          },
          expiresIn: '2h',
        },
      });
    } catch (error) {
      console.error('Dev login error:', error);
      return c.json(
        {
          success: false,
          error: 'Login failed',
          errorCode: 'LOGIN_FAILED',
        },
        500,
      );
    }
  });

  // 開発環境用のユーザー一覧取得
  app.get('/dev-users', async c => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { id: 'asc' },
      });

      return c.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      console.error('Get users error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to get users',
        },
        500,
      );
    }
  });
}

// テスト用の簡単なエンドポイント
app.get('/test', c => {
  return c.json({ message: 'Auth route is working', env: process.env.NODE_ENV });
});

export default app;
