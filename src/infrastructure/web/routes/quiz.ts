// Hono API ルート - Quiz関連

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import type { Variables } from '../middleware/auth';

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
  const app = new Hono<{ Variables: Variables }>();

  // GET /api/quiz/questions - 問題一覧取得（カテゴリ別、ランダム等）
  app.get("/questions", async (c) => {
    try {
      const category = c.req.query("category");
      const limit = parseInt(c.req.query("limit") || "10");
      const random = c.req.query("random") === "true";

      const whereClause: any = {};
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
        choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
        tags: q.tags && typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []),
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

        // 問題を取得
        const whereClause: any = {};
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
          choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
          tags: q.tags && typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []),
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
        const authUser = c.get('authUser') || { userId: 0 };
        const userId = authUser.userId;

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
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;
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
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;

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
          averageScore: Math.round(averageScore._avg?.score || 0),
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            sessionCount: stat._count?.category || 0,
            averageScore: Math.round(stat._avg?.score || 0),
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

  // GET /api/quiz/weak-points - 苦手分野分析
  app.get("/weak-points", async (c) => {
    try {
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;
      const limit = parseInt(c.req.query("limit") || "5");

      // カテゴリ別の正答率を計算
      const categoryPerformance = await prisma.$queryRaw`
        SELECT 
          q.category,
          COUNT(*) as total_answers,
          SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct_answers,
          ROUND(
            (SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
          ) as accuracy_rate
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id  
        WHERE ua.user_id = ${userId}
        GROUP BY q.category
        HAVING COUNT(*) >= 3
        ORDER BY accuracy_rate ASC, total_answers DESC
        LIMIT ${limit}
      `;

      return c.json({
        success: true,
        data: categoryPerformance,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "苦手分野分析の取得に失敗しました",
        },
        500
      );
    }
  });

  // GET /api/quiz/recommendations - 学習推奨問題
  app.get("/recommendations", async (c) => {
    try {
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;
      const limit = parseInt(c.req.query("limit") || "10");

      // 苦手カテゴリを取得
      const weakCategories = await prisma.$queryRaw`
        SELECT q.category
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id  
        WHERE ua.user_id = ${userId}
        GROUP BY q.category
        HAVING COUNT(*) >= 3 AND 
               (SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) < 70
        ORDER BY (SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ASC
        LIMIT 3
      ` as any[];

      if (weakCategories.length === 0) {
        // 苦手分野がない場合はランダムな問題を推奨
        const randomQuestions = await prisma.question.findMany({
          take: limit,
          orderBy: { number: 'asc' },
          select: {
            id: true,
            category: true,
            subcategory: true,
            difficulty: true,
            question: true,
            choices: true,
            tags: true,
          },
        });

        return c.json({
          success: true,
          data: {
            reason: "general_practice",
            questions: randomQuestions.map(q => ({
              ...q,
              choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
              tags: q.tags && typeof q.tags === "string" ? JSON.parse(q.tags) : (q.tags || []),
            })),
          },
        });
      }

      // 苦手カテゴリから未回答の問題を取得
      const categoryList = weakCategories.map(cat => cat.category);
      
      const recommendedQuestions = await prisma.question.findMany({
        where: {
          category: { in: categoryList },
          NOT: {
            userAnswers: {
              some: { userId },
            },
          },
        },
        take: limit,
        orderBy: [
          { difficulty: 'asc' },
          { number: 'asc' },
        ],
        select: {
          id: true,
          category: true,
          subcategory: true,
          difficulty: true,
          question: true,
          choices: true,
          tags: true,
        },
      });

      return c.json({
        success: true,
        data: {
          reason: "weak_category_focus",
          weakCategories: categoryList,
          questions: recommendedQuestions.map(q => ({
            ...q,
            choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
            tags: q.tags && typeof q.tags === "string" ? JSON.parse(q.tags) : (q.tags || []),
          })),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "推奨問題の取得に失敗しました",
        },
        500
      );
    }
  });

  // GET /api/quiz/progress - 学習進捗取得
  app.get("/progress", async (c) => {
    try {
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;

      // 全問題数
      const totalQuestions = await prisma.question.count();

      // 回答済み問題数（ユニーク）
      const answeredQuestions = await prisma.userAnswer.groupBy({
        by: ['questionId'],
        where: { userId },
      });
      const answeredQuestionsCount = answeredQuestions.length;

      // カテゴリ別進捗
      const categoryProgress = await prisma.$queryRaw`
        SELECT 
          q.category,
          COUNT(DISTINCT q.id) as total_questions,
          COUNT(DISTINCT ua.question_id) as answered_questions,
          ROUND(
            (COUNT(DISTINCT ua.question_id) * 100.0 / COUNT(DISTINCT q.id)), 2
          ) as progress_rate
        FROM questions q
        LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ${userId}
        GROUP BY q.category
        ORDER BY q.category
      `;

      // 最近の学習活動
      const recentActivity = await prisma.quizSession.findMany({
        where: { userId, isCompleted: true },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          category: true,
          score: true,
          totalQuestions: true,
          correctAnswers: true,
          completedAt: true,
        },
      });

      return c.json({
        success: true,
        data: {
          overall: {
            totalQuestions,
            answeredQuestions: answeredQuestionsCount,
            progressRate: Math.round((answeredQuestionsCount / totalQuestions) * 100),
          },
          categoryProgress,
          recentActivity,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "学習進捗の取得に失敗しました",
        },
        500
      );
    }
  });

  // GET /api/quiz/detailed-analysis - 詳細分析
  app.get("/detailed-analysis", async (c) => {
    try {
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;
      const category = c.req.query("category");
      const period = parseInt(c.req.query("period") || "30");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      let categoryFilter = "";
      if (category) {
        categoryFilter = `AND q.category = '${category}'`;
      }

      // 学習効率分析（正答率 vs 回答時間）
      const efficiencyAnalysis = await prisma.$queryRaw`
        SELECT 
          q.difficulty,
          AVG(ua.time_spent) as avg_time,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          COUNT(*) as total_questions
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId} 
          AND ua.time_spent IS NOT NULL
          AND ua.created_at >= ${startDate.toISOString()}
          ${categoryFilter}
        GROUP BY q.difficulty
        ORDER BY q.difficulty ASC
      `;

      // 間違いパターン分析
      const errorPatterns = await prisma.$queryRaw`
        SELECT 
          q.subcategory,
          q.difficulty,
          COUNT(*) as error_count,
          AVG(ua.time_spent) as avg_time_on_errors,
          STRING_AGG(DISTINCT q.tags, ',') as common_tags
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.is_correct = false
          AND ua.created_at >= ${startDate.toISOString()}
          ${categoryFilter}
        GROUP BY q.subcategory, q.difficulty
        HAVING COUNT(*) >= 2
        ORDER BY error_count DESC, q.difficulty DESC
        LIMIT 10
      `;

      // 学習時刻別パフォーマンス
      const timeAnalysis = await prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM ua.created_at) as study_hour,
          COUNT(*) as questions_count,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(ua.time_spent) as avg_time_spent
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= ${startDate.toISOString()}
          ${categoryFilter}
        GROUP BY EXTRACT(HOUR FROM ua.created_at)
        HAVING COUNT(*) >= 3
        ORDER BY study_hour ASC
      `;

      // 復習効果分析
      const reviewEffectiveness = await prisma.$queryRaw`
        SELECT 
          ua.attempt_number,
          COUNT(*) as attempts,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(ua.time_spent) as avg_time_spent
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= ${startDate.toISOString()}
          ${categoryFilter}
        GROUP BY ua.attempt_number
        ORDER BY ua.attempt_number ASC
      `;

      return c.json({
        success: true,
        data: {
          period,
          category,
          efficiencyAnalysis,
          errorPatterns,
          timeAnalysis,
          reviewEffectiveness,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "詳細分析の取得に失敗しました",
        },
        500
      );
    }
  });

  // GET /api/quiz/learning-trends - 学習トレンド分析
  app.get("/learning-trends", async (c) => {
    try {
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;
      const days = parseInt(c.req.query("days") || "14");

      // 日別トレンド
      const dailyTrends = await prisma.$queryRaw`
        SELECT 
          DATE(ua.created_at) as study_date,
          COUNT(DISTINCT ua.question_id) as unique_questions,
          COUNT(*) as total_attempts,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(ua.time_spent) as avg_time_per_question,
          COUNT(DISTINCT q.category) as categories_studied
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(ua.created_at)
        ORDER BY study_date ASC
      `;

      // 累積進捗
      const cumulativeProgress = await prisma.$queryRaw`
        SELECT 
          DATE(ua.created_at) as study_date,
          COUNT(DISTINCT ua.question_id) OVER (ORDER BY DATE(ua.created_at)) as cumulative_questions,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) 
            OVER (ORDER BY DATE(ua.created_at) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_accuracy
        FROM user_answers ua
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(ua.created_at)
        ORDER BY study_date ASC
      `;

      // カテゴリ別学習頻度の変化
      const categoryTrends = await prisma.$queryRaw`
        SELECT 
          q.category,
          DATE(ua.created_at) as study_date,
          COUNT(*) as questions_count,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY q.category, DATE(ua.created_at)
        ORDER BY q.category, study_date ASC
      `;

      return c.json({
        success: true,
        data: {
          period: days,
          dailyTrends,
          cumulativeProgress,
          categoryTrends,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "学習トレンド分析の取得に失敗しました",
        },
        500
      );
    }
  });

  // POST /api/quiz/export - 学習データエクスポート
  app.post("/export", async (c) => {
    try {
      const userIdHeader = c.req.header("X-User-ID") || "0";
      const userId = parseInt(userIdHeader) || 0;
      const body = await c.req.json();
      const { format = "json", period = 30, categories = [] } = body;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      let categoryFilter = "";
      if (categories.length > 0) {
        const categoryList = categories.map((cat: string) => `'${cat}'`).join(',');
        categoryFilter = `AND q.category IN (${categoryList})`;
      }

      const exportData = await prisma.$queryRaw`
        SELECT 
          ua.created_at,
          q.id as question_id,
          q.category,
          q.subcategory,
          q.difficulty,
          q.question,
          ua.user_answer,
          q.answer as correct_answer,
          ua.is_correct,
          ua.time_spent,
          ua.attempt_number,
          q.tags
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= ${startDate.toISOString()}
          ${categoryFilter}
        ORDER BY ua.created_at ASC
      `;

      if (format === "csv") {
        const csvHeaders = "Date,QuestionID,Category,Subcategory,Difficulty,Question,UserAnswer,CorrectAnswer,IsCorrect,TimeSpent,AttemptNumber,Tags\n";
        const csvData = (exportData as any[]).map(row => 
          `"${row.created_at}","${row.question_id}","${row.category}","${row.subcategory}",${row.difficulty},"${row.question?.replace(/"/g, '""')}","${row.user_answer}","${row.correct_answer}",${row.is_correct},${row.time_spent || ''},${row.attempt_number},"${row.tags || ''}"`
        ).join('\n');

        c.header('Content-Type', 'text/csv; charset=utf-8');
        c.header('Content-Disposition', `attachment; filename="quiz_data_${userId}_${period}days.csv"`);
        return c.text(csvHeaders + csvData);
      }

      return c.json({
        success: true,
        data: {
          exportDate: new Date().toISOString(),
          period,
          userId,
          categories,
          totalRecords: (exportData as any[]).length,
          records: exportData,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "データエクスポートに失敗しました",
        },
        400
      );
    }
  });

  return app;
}