// Hono API ルート - Quiz関連（過去問API統合版）

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import type { Variables } from '../middleware/auth';
import { QuestionRepository } from '../../database/repositories/QuestionRepository.js';
import { GetQuestion } from '../../../domain/usecases/GetQuestion.js';
import { AnswerQuestion } from '../../../domain/usecases/AnswerQuestion.js';

const prisma = new PrismaClient();
const questionRepository = new QuestionRepository(prisma);
const getQuestionUseCase = new GetQuestion(questionRepository);
const answerQuestionUseCase = new AnswerQuestion(questionRepository, prisma);

// バリデーションスキーマ
const startQuizSchema = z.object({
  category: z.string().optional(),
  sessionType: z.enum(['category', 'random', 'review', 'weak_points']),
  questionCount: z.number().min(1).max(50).default(10),
});

const submitAnswerSchema = z.object({
  sessionId: z.number(),
  questionId: z.string(),
  userAnswer: z.string(),
  timeSpent: z.number().min(0).optional(),
});

const completeQuizSchema = z.object({
  sessionId: z.number(),
});

export function createQuizRoutes() {
  const app = new Hono<{ Variables: Variables }>();

  // GET /api/quiz/questions - 問題一覧取得（統合版）
  app.get('/questions', async c => {
    try {
      const category = c.req.query('category');
      const limit = parseInt(c.req.query('limit') || '10');
      const random = c.req.query('random') === 'true';
      const year = c.req.query('year') ? parseInt(c.req.query('year')!) : undefined;
      const section = c.req.query('section');
      const difficulty = c.req.query('difficulty') ? parseInt(c.req.query('difficulty')!) : undefined;

      // リポジトリパターンを使用
      const filters = {
        ...(category && { category }),
        ...(year && { year }),
        ...(section && { section }),
        ...(difficulty && { difficulty }),
      };

      const options = {
        limit,
        random,
      };

      const questions = await getQuestionUseCase.getMany({ filters, options });

      return c.json({
        success: true,
        data: questions,
        meta: {
          total: questions.length,
          category,
          random,
          filters,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '問題の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/questions/random/:count - ランダム問題取得（統合版）
  app.get('/questions/random/:count', async c => {
    try {
      const count = parseInt(c.req.param('count'));
      const category = c.req.query('category');
      const year = c.req.query('year') ? parseInt(c.req.query('year')!) : undefined;
      const section = c.req.query('section');
      const difficulty = c.req.query('difficulty') ? parseInt(c.req.query('difficulty')!) : undefined;

      if (isNaN(count) || count <= 0) {
        return c.json({ success: false, error: 'Invalid count parameter' }, 400);
      }

      const filters = {
        ...(category && { category }),
        ...(year && { year }),
        ...(section && { section }),
        ...(difficulty && { difficulty }),
      };

      const questions = await getQuestionUseCase.getRandomQuestions(count, filters);

      return c.json({
        success: true,
        data: questions,
        meta: { count: questions.length, filters },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'ランダム問題の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/questions/:id - 特定問題取得（統合版）
  app.get('/questions/:id', async c => {
    try {
      const questionId = c.req.param('id');
      const question = await getQuestionUseCase.execute({ questionId });

      if (!question) {
        return c.json({ success: false, error: 'Question not found' }, 404);
      }

      return c.json({ success: true, data: question });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '問題の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/categories - カテゴリ一覧取得
  app.get('/categories', async c => {
    try {
      const categories = await prisma.question.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { category: 'asc' },
      });

      return c.json({
        success: true,
        data: categories.map(cat => ({
          category: cat.category,
          questionCount: cat._count.category,
        })),
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'カテゴリの取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/questions/category/:category - カテゴリ別問題取得（統合版）
  app.get('/questions/category/:category', async c => {
    try {
      const category = decodeURIComponent(c.req.param('category'));
      const limit = parseInt(c.req.query('limit') || '10');
      const offset = parseInt(c.req.query('offset') || '0');

      const questions = await getQuestionUseCase.getQuestionsByCategory(category, { limit, offset });

      return c.json({
        success: true,
        data: questions,
        meta: { category, total: questions.length },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'カテゴリ別問題の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/questions/stats - 問題統計情報（統合版）
  app.get('/questions/stats', async c => {
    try {
      const totalQuestions = await getQuestionUseCase.countQuestions();

      // 年度別統計
      const yearStats = await prisma.question.groupBy({
        by: ['year'],
        _count: { id: true },
        orderBy: { year: 'desc' },
      });

      // カテゴリ別統計
      const categoryStats = await prisma.question.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      // セクション別統計
      const sectionStats = await prisma.question.groupBy({
        by: ['section'],
        _count: { id: true },
      });

      return c.json({
        success: true,
        data: {
          total: totalQuestions,
          byYear: yearStats.map(stat => ({
            year: stat.year,
            count: stat._count.id,
          })),
          byCategory: categoryStats.map(stat => ({
            category: stat.category,
            count: stat._count.id,
          })),
          bySection: sectionStats.map(stat => ({
            section: stat.section,
            count: stat._count.id,
          })),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '統計情報の取得に失敗しました',
        },
        500,
      );
    }
  });

  // POST /api/quiz/start - Quizセッション開始
  app.post('/start', zValidator('json', startQuizSchema), async c => {
    try {
      const { category, sessionType, questionCount } = c.req.valid('json');
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;

      // Quizセッションを作成
      const session = await prisma.quizSession.create({
        data: {
          userId,
          sessionType,
          category,
          totalQuestions: questionCount,
        },
      });

      // 問題を取得（リポジトリパターン使用）
      const filters = {
        ...(category && sessionType === 'category' && { category }),
      };

      const options = {
        limit: questionCount,
        random: sessionType === 'random',
      };

      const questions =
        sessionType === 'random'
          ? await getQuestionUseCase.getRandomQuestions(questionCount, filters)
          : await getQuestionUseCase.getMany({ filters, options });

      const parsedQuestions = questions.map(q => ({
        ...q,
        choices: typeof q.choices === 'string' ? JSON.parse(q.choices as string) : q.choices,
        tags: q.tags && typeof q.tags === 'string' ? JSON.parse(q.tags as string) : q.tags || [],
      }));

      return c.json({
        success: true,
        data: {
          sessionId: session.id,
          questions: parsedQuestions,
          totalQuestions: parsedQuestions.length,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Quizセッションの開始に失敗しました',
        },
        400,
      );
    }
  });

  // POST /api/quiz/answer - 回答提出（統合版・正解表示対応）
  app.post('/answer', zValidator('json', submitAnswerSchema), async c => {
    try {
      const { sessionId, questionId, userAnswer, timeSpent } = c.req.valid('json');
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;

      // リポジトリパターンで回答処理
      const response = await answerQuestionUseCase.execute({
        userId,
        questionId,
        userAnswer,
        timeSpent,
      });

      const { result } = response;

      // セッション統計を更新
      if (result.isCorrect) {
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: {
            correctAnswers: {
              increment: 1,
            },
          },
        });
      }

      if (timeSpent) {
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: {
            totalTime: {
              increment: timeSpent,
            },
          },
        });
      }

      return c.json({
        success: true,
        data: {
          answerId: response.userAnswerId,
          isCorrect: result.isCorrect,
          correctAnswer: result.correctAnswer,
          explanation: result.explanation,
          userAnswer: result.userAnswer,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '回答の提出に失敗しました',
        },
        400,
      );
    }
  });

  // POST /api/quiz/complete - Quizセッション完了
  app.post('/complete', zValidator('json', completeQuizSchema), async c => {
    try {
      const { sessionId } = c.req.valid('json');

      // セッション情報を取得
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return c.json({ success: false, error: 'セッションが見つかりません' }, 404);
      }

      // スコアと平均時間を計算
      const score = Math.round((session.correctAnswers / session.totalQuestions) * 100);
      const avgTimePerQ = session.totalTime > 0 ? Math.round(session.totalTime / session.totalQuestions) : 0;

      // セッションを完了状態に更新
      const updatedSession = await prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          score,
          avgTimePerQ,
        },
      });

      return c.json({
        success: true,
        data: {
          sessionId: updatedSession.id,
          totalQuestions: updatedSession.totalQuestions,
          correctAnswers: updatedSession.correctAnswers,
          score,
          totalTime: updatedSession.totalTime,
          avgTimePerQ,
          completedAt: updatedSession.completedAt,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Quizセッションの完了に失敗しました',
        },
        400,
      );
    }
  });

  // GET /api/quiz/sessions - セッション履歴取得
  app.get('/sessions', async c => {
    try {
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;
      const limit = parseInt(c.req.query('limit') || '10');
      const offset = parseInt(c.req.query('offset') || '0');

      const sessions = await prisma.quizSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const totalSessions = await prisma.quizSession.count({
        where: { userId },
      });

      return c.json({
        success: true,
        data: sessions,
        meta: {
          total: totalSessions,
          limit,
          offset,
          hasMore: offset + limit < totalSessions,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'セッション履歴の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/stats - 統計情報取得（ユーザー別）
  app.get('/stats', async c => {
    try {
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;

      const sessions = await prisma.quizSession.findMany({
        where: { userId, isCompleted: true },
        orderBy: { completedAt: 'desc' },
      });

      if (sessions.length === 0) {
        return c.json({
          success: true,
          data: {
            totalSessions: 0,
            totalQuestions: 0,
            totalCorrect: 0,
            averageScore: 0,
            averageTime: 0,
            recentSessions: [],
          },
        });
      }

      const totalSessions = sessions.length;
      const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
      const totalCorrect = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
      const totalTime = sessions.reduce((sum, s) => sum + s.totalTime, 0);

      const averageScore = Math.round((totalCorrect / totalQuestions) * 100);
      const averageTime = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;

      return c.json({
        success: true,
        data: {
          totalSessions,
          totalQuestions,
          totalCorrect,
          averageScore,
          averageTime,
          recentSessions: sessions.slice(0, 5),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '統計情報の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/weak-points - 苦手分野分析
  app.get('/weak-points', async c => {
    try {
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;

      const userAnswers = await prisma.userAnswer.findMany({
        where: { userId },
        include: {
          question: {
            select: {
              category: true,
              subcategory: true,
              difficulty: true,
            },
          },
        },
      });

      if (userAnswers.length === 0) {
        return c.json({
          success: true,
          data: {
            message: 'まだ回答データがありません',
            weakCategories: [],
            recommendations: [],
          },
        });
      }

      // カテゴリ別正答率を計算
      const categoryStats: Record<string, { total: number; correct: number }> = {};

      userAnswers.forEach(answer => {
        const category = answer.question.category;
        if (!categoryStats[category]) {
          categoryStats[category] = { total: 0, correct: 0 };
        }
        categoryStats[category].total++;
        if (answer.isCorrect) {
          categoryStats[category].correct++;
        }
      });

      const weakCategories = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          correctRate: Math.round((stats.correct / stats.total) * 100),
          totalAnswered: stats.total,
          correctAnswered: stats.correct,
        }))
        .filter(cat => cat.correctRate < 70) // 70%未満を苦手分野とする
        .sort((a, b) => a.correctRate - b.correctRate);

      return c.json({
        success: true,
        data: {
          weakCategories,
          totalAnswered: userAnswers.length,
          overallCorrectRate: Math.round((userAnswers.filter(a => a.isCorrect).length / userAnswers.length) * 100),
          recommendations:
            weakCategories.length > 0
              ? [`${weakCategories[0].category}の問題を重点的に学習することをお勧めします`]
              : ['バランス良く学習を続けてください'],
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '苦手分野分析に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/recommendations - 学習推奨問題
  app.get('/recommendations', async c => {
    try {
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;
      const limit = parseInt(c.req.query('limit') || '10');

      // 最近間違えた問題のカテゴリを取得
      const recentWrongAnswers = await prisma.userAnswer.findMany({
        where: {
          userId,
          isCorrect: false,
        },
        include: {
          question: {
            select: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const weakCategories = [...new Set(recentWrongAnswers.map(a => a.question.category))];

      if (weakCategories.length === 0) {
        // 苦手分野がない場合はランダムに推奨
        const randomQuestions = await getQuestionUseCase.getRandomQuestions(limit);
        return c.json({
          success: true,
          data: {
            questions: randomQuestions,
            reason: 'ランダムな問題を推奨します',
          },
        });
      }

      // 苦手カテゴリから問題を推奨
      const recommendedQuestions = await getQuestionUseCase.getMany({
        filters: { category: weakCategories[0] },
        options: { limit, random: true },
      });

      return c.json({
        success: true,
        data: {
          questions: recommendedQuestions,
          reason: `苦手分野「${weakCategories[0]}」の問題を推奨します`,
          weakCategories,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '推奨問題の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/quiz/progress - 学習進捗取得
  app.get('/progress', async c => {
    try {
      const authUser = c.get('authUser') || { userId: 0 };
      const userId = authUser.userId;

      // 日別進捗データを取得（過去30日）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyProgress = (await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as questions_answered,
          SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers
        FROM user_answers 
        WHERE user_id = ${userId} 
          AND created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `) as Array<{
        date: string;
        questions_answered: number;
        correct_answers: number;
      }>;

      // カテゴリ別進捗
      const categoryProgress = await prisma.userAnswer.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        include: {
          question: {
            select: {
              category: true,
            },
          },
        },
      });

      const categoryStats: Record<string, { total: number; correct: number }> = {};
      categoryProgress.forEach(answer => {
        const category = answer.question.category;
        if (!categoryStats[category]) {
          categoryStats[category] = { total: 0, correct: 0 };
        }
        categoryStats[category].total++;
        if (answer.isCorrect) {
          categoryStats[category].correct++;
        }
      });

      const categoryProgressData = Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        totalAnswered: stats.total,
        correctAnswered: stats.correct,
        correctRate: Math.round((stats.correct / stats.total) * 100),
      }));

      return c.json({
        success: true,
        data: {
          dailyProgress: dailyProgress.map(day => ({
            ...day,
            correctRate: Math.round((day.correct_answers / day.questions_answered) * 100),
          })),
          categoryProgress: categoryProgressData,
          totalDays: dailyProgress.length,
          totalQuestionsThisMonth: dailyProgress.reduce((sum, day) => sum + day.questions_answered, 0),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '学習進捗の取得に失敗しました',
        },
        500,
      );
    }
  });

  return app;
}
