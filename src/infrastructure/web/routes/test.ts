// Hono API ルート - 問題演習記録関連

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

// バリデーションスキーマ
const morningTestSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  category: z.string().min(1, "分野は必須です"),
  totalQuestions: z.number().min(1, "問題数は1以上必要です"),
  correctAnswers: z.number().min(0, "正答数は0以上必要です"),
  timeSpent: z.number().min(1, "所要時間は1分以上必要です"),
  memo: z.string().optional().default("")
}).refine(data => data.correctAnswers <= data.totalQuestions, {
  message: "正答数は総問題数以下である必要があります"
});

const afternoonTestSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  category: z.string().min(1, "分野は必須です"),
  score: z.number().min(0).max(100, "得点は0-100の範囲で入力してください"),
  timeSpent: z.number().min(1, "所要時間は1分以上必要です"),
  memo: z.string().optional().default("")
});

const dateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

export function createTestRoutes(prisma: PrismaClient) {
  const app = new Hono();

  // === 午前問題記録 ===

  // POST /api/test/morning - 午前問題記録作成
  app.post("/morning", zValidator("json", morningTestSchema as any), async (c) => {
    try {
      const testData = c.req.valid("json");
      
      const morningTest = await prisma.morningTest.create({
        data: {
          date: testData.date,
          category: testData.category,
          totalQuestions: testData.totalQuestions,
          correctAnswers: testData.correctAnswers,
          timeSpent: testData.timeSpent,
          memo: testData.memo
        }
      });

      const accuracy = (morningTest.correctAnswers / morningTest.totalQuestions) * 100;

      return c.json({
        success: true,
        data: {
          id: morningTest.id,
          date: morningTest.date,
          category: morningTest.category,
          totalQuestions: morningTest.totalQuestions,
          correctAnswers: morningTest.correctAnswers,
          accuracy: Math.round(accuracy * 10) / 10,
          timeSpent: morningTest.timeSpent,
          memo: morningTest.memo
        },
        message: "午前問題記録が作成されました"
      }, 201);
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午前問題記録の作成に失敗しました"
      }, 400);
    }
  });

  // GET /api/test/morning - 午前問題記録一覧取得
  app.get("/morning", async (c) => {
    try {
      const morningTests = await prisma.morningTest.findMany({
        orderBy: { date: 'desc' }
      });

      return c.json({
        success: true,
        data: morningTests.map(test => ({
          id: test.id,
          date: test.date,
          category: test.category,
          totalQuestions: test.totalQuestions,
          correctAnswers: test.correctAnswers,
          accuracy: Math.round((test.correctAnswers / test.totalQuestions) * 1000) / 10,
          timeSpent: test.timeSpent,
          memo: test.memo
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午前問題記録の取得に失敗しました"
      }, 500);
    }
  });

  // GET /api/test/morning/:id - 特定の午前問題記録取得
  app.get("/morning/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const morningTest = await prisma.morningTest.findUnique({
        where: { id }
      });

      if (!morningTest) {
        return c.json({
          success: false,
          error: "午前問題記録が見つかりません"
        }, 404);
      }

      const accuracy = (morningTest.correctAnswers / morningTest.totalQuestions) * 100;

      return c.json({
        success: true,
        data: {
          id: morningTest.id,
          date: morningTest.date,
          category: morningTest.category,
          totalQuestions: morningTest.totalQuestions,
          correctAnswers: morningTest.correctAnswers,
          accuracy: Math.round(accuracy * 10) / 10,
          timeSpent: morningTest.timeSpent,
          memo: morningTest.memo
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午前問題記録の取得に失敗しました"
      }, 500);
    }
  });

  // DELETE /api/test/morning/:id - 午前問題記録削除
  app.delete("/morning/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      
      const existingTest = await prisma.morningTest.findUnique({
        where: { id }
      });

      if (!existingTest) {
        return c.json({
          success: false,
          error: "午前問題記録が見つかりません"
        }, 404);
      }

      await prisma.morningTest.delete({
        where: { id }
      });

      return c.json({
        success: true,
        message: "午前問題記録が削除されました"
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午前問題記録の削除に失敗しました"
      }, 500);
    }
  });

  // === 午後問題記録 ===

  // POST /api/test/afternoon - 午後問題記録作成
  app.post("/afternoon", zValidator("json", afternoonTestSchema as any), async (c) => {
    try {
      const testData = c.req.valid("json");
      
      const afternoonTest = await prisma.afternoonTest.create({
        data: {
          date: testData.date,
          category: testData.category,
          score: testData.score,
          timeSpent: testData.timeSpent,
          memo: testData.memo
        }
      });

      return c.json({
        success: true,
        data: {
          id: afternoonTest.id,
          date: afternoonTest.date,
          category: afternoonTest.category,
          score: afternoonTest.score,
          timeSpent: afternoonTest.timeSpent,
          memo: afternoonTest.memo
        },
        message: "午後問題記録が作成されました"
      }, 201);
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午後問題記録の作成に失敗しました"
      }, 400);
    }
  });

  // GET /api/test/afternoon - 午後問題記録一覧取得
  app.get("/afternoon", async (c) => {
    try {
      const afternoonTests = await prisma.afternoonTest.findMany({
        orderBy: { date: 'desc' }
      });

      return c.json({
        success: true,
        data: afternoonTests
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午後問題記録の取得に失敗しました"
      }, 500);
    }
  });

  // GET /api/test/afternoon/:id - 特定の午後問題記録取得
  app.get("/afternoon/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const afternoonTest = await prisma.afternoonTest.findUnique({
        where: { id }
      });

      if (!afternoonTest) {
        return c.json({
          success: false,
          error: "午後問題記録が見つかりません"
        }, 404);
      }

      return c.json({
        success: true,
        data: afternoonTest
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午後問題記録の取得に失敗しました"
      }, 500);
    }
  });

  // DELETE /api/test/afternoon/:id - 午後問題記録削除
  app.delete("/afternoon/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      
      const existingTest = await prisma.afternoonTest.findUnique({
        where: { id }
      });

      if (!existingTest) {
        return c.json({
          success: false,
          error: "午後問題記録が見つかりません"
        }, 404);
      }

      await prisma.afternoonTest.delete({
        where: { id }
      });

      return c.json({
        success: true,
        message: "午後問題記録が削除されました"
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午後問題記録の削除に失敗しました"
      }, 500);
    }
  });

  // === 統計・分析 ===

  // GET /api/test/morning/stats - 午前問題統計
  app.get("/morning/stats", async (c) => {
    try {
      const morningStats = await prisma.morningTest.aggregate({
        _count: { id: true },
        _avg: { correctAnswers: true, totalQuestions: true, timeSpent: true },
        _sum: { correctAnswers: true, totalQuestions: true }
      });

      // 分野別統計
      const categoryStats = await prisma.morningTest.groupBy({
        by: ['category'],
        _count: { id: true },
        _avg: { correctAnswers: true, totalQuestions: true }
      });

      const overallAccuracy = morningStats._sum.totalQuestions 
        ? (morningStats._sum.correctAnswers! / morningStats._sum.totalQuestions!) * 100
        : 0;

      return c.json({
        success: true,
        data: {
          totalTests: morningStats._count.id,
          overallAccuracy: Math.round(overallAccuracy * 10) / 10,
          averageTimeSpent: Math.round((morningStats._avg.timeSpent || 0) * 10) / 10,
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            testCount: stat._count.id,
            averageAccuracy: Math.round((stat._avg.correctAnswers! / stat._avg.totalQuestions!) * 1000) / 10
          }))
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午前問題統計の取得に失敗しました"
      }, 500);
    }
  });

  // GET /api/test/afternoon/stats - 午後問題統計
  app.get("/afternoon/stats", async (c) => {
    try {
      const afternoonStats = await prisma.afternoonTest.aggregate({
        _count: { id: true },
        _avg: { score: true, timeSpent: true },
        _max: { score: true },
        _min: { score: true }
      });

      // 分野別統計
      const categoryStats = await prisma.afternoonTest.groupBy({
        by: ['category'],
        _count: { id: true },
        _avg: { score: true }
      });

      return c.json({
        success: true,
        data: {
          totalTests: afternoonStats._count.id,
          averageScore: Math.round((afternoonStats._avg.score || 0) * 10) / 10,
          maxScore: afternoonStats._max.score || 0,
          minScore: afternoonStats._min.score || 0,
          averageTimeSpent: Math.round((afternoonStats._avg.timeSpent || 0) * 10) / 10,
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            testCount: stat._count.id,
            averageScore: Math.round((stat._avg.score || 0) * 10) / 10
          }))
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "午後問題統計の取得に失敗しました"
      }, 500);
    }
  });

  // POST /api/test/morning/date-range - 期間指定で午前問題記録取得
  app.post("/morning/date-range", zValidator("json", dateRangeSchema as any), async (c) => {
    try {
      const { startDate, endDate } = c.req.valid("json");
      const morningTests = await prisma.morningTest.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'desc' }
      });

      return c.json({
        success: true,
        data: morningTests.map(test => ({
          id: test.id,
          date: test.date,
          category: test.category,
          totalQuestions: test.totalQuestions,
          correctAnswers: test.correctAnswers,
          accuracy: Math.round((test.correctAnswers / test.totalQuestions) * 1000) / 10,
          timeSpent: test.timeSpent,
          memo: test.memo
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "期間指定での午前問題記録取得に失敗しました"
      }, 400);
    }
  });

  // POST /api/test/afternoon/date-range - 期間指定で午後問題記録取得
  app.post("/afternoon/date-range", zValidator("json", dateRangeSchema as any), async (c) => {
    try {
      const { startDate, endDate } = c.req.valid("json");
      const afternoonTests = await prisma.afternoonTest.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'desc' }
      });

      return c.json({
        success: true,
        data: afternoonTests
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "期間指定での午後問題記録取得に失敗しました"
      }, 400);
    }
  });

  return app;
}