// Hono API ルート - Quiz関連

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// バリデーションスキーマ
const startQuizSchema = z.object({
  category: z.string().optional(),
  sessionType: z.enum(["category", "random", "review", "weak_points"]),
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
  const app = new Hono();

  // GET /api/quiz/questions - 問題一覧取得（カテゴリ別、ランダム等）
  app.get("/questions", async (c) => {
    try {
      const category = c.req.query("category");
      const limit = parseInt(c.req.query("limit") || "10");
      const random = c.req.query("random") === "true";

      let whereClause: any = {};
      if (category) {
        whereClause.category = category;
      }

      const questions = await prisma.question.findMany({
        where: whereClause,
        take: limit,
        orderBy: random ? undefined : { number: 'asc' },
        select: {
          id: true,
          year: true,
          season: true,
          section: true,
          number: true,
          category: true,
          subcategory: true,
          difficulty: true,
          question: true,
          choices: true,
          tags: true,
        },
      });

      // ランダムソートが必要な場合
      const finalQuestions = random 
        ? questions.sort(() => Math.random() - 0.5).slice(0, limit)
        : questions;

      // choicesをJSONパース
      const parsedQuestions = finalQuestions.map(q => ({
        ...q,
        choices: JSON.parse(q.choices),
        tags: q.tags ? JSON.parse(q.tags) : [],
      }));

      return c.json({
        success: true,
        data: parsedQuestions,
        meta: {
          total: parsedQuestions.length,
          category,
          random,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "問題の取得に失敗しました",
        },
        500
      );
    }
  });

  // GET /api/quiz/categories - カテゴリ一覧取得
  app.get("/categories", async (c) => {
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
          error: error instanceof Error ? error.message : "カテゴリの取得に失敗しました",
        },
        500
      );
    }
  });

  // POST /api/quiz/start - Quizセッション開始
  app.post(
    "/start",
    zValidator("json", startQuizSchema as any),
    async (c) => {
      try {
        const { category, sessionType, questionCount } = c.req.valid("json");
        const userId = c.req.header("X-User-ID") || "anonymous";

        // Quizセッションを作成
        const session = await prisma.quizSession.create({
          data: {
            userId,
            sessionType,
            category,
            totalQuestions: questionCount,
          },
        });

        // 問題を取得
        let whereClause: any = {};
        if (category && sessionType === "category") {
          whereClause.category = category;
        }

        const questions = await prisma.question.findMany({
          where: whereClause,
          take: questionCount,
          orderBy: sessionType === "random" ? undefined : { number: 'asc' },
          select: {
            id: true,
            year: true,
            season: true,
            section: true,
            number: true,
            category: true,
            subcategory: true,
            difficulty: true,
            question: true,
            choices: true,
            tags: true,
          },
        });

        // ランダムソートが必要な場合
        const finalQuestions = sessionType === "random" 
          ? questions.sort(() => Math.random() - 0.5).slice(0, questionCount)
          : questions;

        // choicesをJSONパース
        const parsedQuestions = finalQuestions.map(q => ({
          ...q,
          choices: JSON.parse(q.choices),
          tags: q.tags ? JSON.parse(q.tags) : [],
        }));

        return c.json({
          success: true,
          data: {
            sessionId: session.id,
            questions: parsedQuestions,
            totalQuestions: questionCount,
            sessionType,
            category,
          },
        });
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Quizセッションの開始に失敗しました",
          },
          400
        );
      }
    }
  );

  // POST /api/quiz/answer - 回答提出
  app.post(
    "/answer",
    zValidator("json", submitAnswerSchema as any),
    async (c) => {
      try {
        const { sessionId, questionId, userAnswer, timeSpent } = c.req.valid("json");
        const userId = c.req.header("X-User-ID") || "anonymous";

        // 問題の正解を取得
        const question = await prisma.question.findUnique({
          where: { id: questionId },
          select: { answer: true },
        });

        if (!question) {
          return c.json(
            { success: false, error: "問題が見つかりません" },
            404
          );
        }

        const isCorrect = userAnswer.toUpperCase() === question.answer.toUpperCase();

        // 回答を記録
        const userAnswerRecord = await prisma.userAnswer.create({
          data: {
            userId,
            questionId,
            userAnswer: userAnswer.toUpperCase(),
            isCorrect,
            timeSpent,
          },
        });

        // セッション統計を更新
        if (isCorrect) {
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
            answerId: userAnswerRecord.id,
            isCorrect,
            correctAnswer: question.answer,
          },
        });
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "回答の提出に失敗しました",
          },
          400
        );
      }
    }
  );

  // POST /api/quiz/complete - Quizセッション完了
  app.post(
    "/complete",
    zValidator("json", completeQuizSchema as any),
    async (c) => {
      try {
        const { sessionId } = c.req.valid("json");

        // セッション情報を取得
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          return c.json(
            { success: false, error: "セッションが見つかりません" },
            404
          );
        }

        // スコアと平均時間を計算
        const score = Math.round((session.correctAnswers / session.totalQuestions) * 100);
        const avgTimePerQ = session.totalTime > 0 
          ? Math.round(session.totalTime / session.totalQuestions)
          : 0;

        // セッションを完了状態に更新
        const completedSession = await prisma.quizSession.update({
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
            sessionId: completedSession.id,
            totalQuestions: completedSession.totalQuestions,
            correctAnswers: completedSession.correctAnswers,
            score: completedSession.score,
            totalTime: completedSession.totalTime,
            avgTimePerQ: completedSession.avgTimePerQ,
            category: completedSession.category,
            sessionType: completedSession.sessionType,
          },
          message: "Quizセッションが完了しました",
        });
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "セッションの完了に失敗しました",
          },
          400
        );
      }
    }
  );

  // GET /api/quiz/sessions - セッション履歴取得
  app.get("/sessions", async (c) => {
    try {
      const userId = c.req.header("X-User-ID") || "anonymous";
      const limit = parseInt(c.req.query("limit") || "20");

      const sessions = await prisma.quizSession.findMany({
        where: {
          userId,
          isCompleted: true,
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
      });

      return c.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "セッション履歴の取得に失敗しました",
        },
        500
      );
    }
  });

  // GET /api/quiz/stats - 統計情報取得
  app.get("/stats", async (c) => {
    try {
      const userId = c.req.header("X-User-ID") || "anonymous";

      // 全体統計
      const totalSessions = await prisma.quizSession.count({
        where: { userId, isCompleted: true },
      });

      const averageScore = await prisma.quizSession.aggregate({
        where: { userId, isCompleted: true },
        _avg: { score: true },
      });

      // カテゴリ別統計
      const categoryStats = await prisma.quizSession.groupBy({
        by: ['category'],
        where: { userId, isCompleted: true, category: { not: null } },
        _avg: { score: true },
        _count: { category: true },
      });

      return c.json({
        success: true,
        data: {
          totalSessions,
          averageScore: Math.round(averageScore._avg.score || 0),
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            sessionCount: stat._count.category,
            averageScore: Math.round(stat._avg.score || 0),
          })),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "統計情報の取得に失敗しました",
        },
        500
      );
    }
  });

  return app;
}