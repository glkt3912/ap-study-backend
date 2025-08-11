import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getAuthUser } from '../middleware/auth.js';
import type { Variables } from '../middleware/auth.js';

const app = new Hono<{ Variables: Variables }>();
const prisma = new PrismaClient();

// 試験設定作成・更新用のスキーマ
const examConfigSchema = z.object({
  examDate: z.string().transform((val) => new Date(val)),
  targetScore: z.number().optional(),
});

// 試験設定取得
app.get('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const examConfig = await prisma.examConfig.findUnique({
      where: { userId },
    });

    if (!examConfig) {
      return c.json({ error: 'Exam configuration not found' }, 404);
    }

    // 残り日数を計算
    const now = new Date();
    const examDate = new Date(examConfig.examDate);
    const remainingDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return c.json({
      ...examConfig,
      remainingDays,
    });
  } catch (error) {
    console.error('Error fetching exam config:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 試験設定作成・更新
app.post('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const body = await c.req.json();
    const validatedData = examConfigSchema.parse(body);

    // 既存の設定があるかチェック
    const existingConfig = await prisma.examConfig.findUnique({
      where: { userId },
    });

    let examConfig;
    if (existingConfig) {
      // 更新
      examConfig = await prisma.examConfig.update({
        where: { userId },
        data: validatedData,
      });
    } else {
      // 新規作成
      examConfig = await prisma.examConfig.create({
        data: {
          userId,
          ...validatedData,
        },
      });
    }

    // 残り日数を計算
    const now = new Date();
    const examDate = new Date(examConfig.examDate);
    const remainingDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return c.json({
      ...examConfig,
      remainingDays,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.issues }, 400);
    }
    console.error('Error creating/updating exam config:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 試験設定削除
app.delete('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    await prisma.examConfig.delete({
      where: { userId },
    });

    return c.json({ message: 'Exam configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam config:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;