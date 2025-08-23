import { Hono } from 'hono';
import type { Variables } from '../middleware/auth';
import { deleteCookie } from 'hono/cookie';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';

const app = new Hono<{ Variables: Variables }>();
const prisma = new PrismaClient();

/**
 * ログアウト
 * - HttpOnly Cookieを削除
 * - データベースのリフレッシュトークンを無効化
 */
app.post('/logout', authMiddleware, async c => {
  try {
    const authUser = getAuthUser(c);

    // データベースのリフレッシュトークンを無効化
    await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        refreshToken: null,
        refreshTokenExp: null,
      },
    });

    // HttpOnly Cookieを削除
    deleteCookie(c, 'access_token');
    deleteCookie(c, 'refresh_token');

    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message: 'Logout failed',
      },
      500,
    );
  }
});

export default app;
