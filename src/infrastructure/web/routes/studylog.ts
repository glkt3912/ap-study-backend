// Hono API ルート - 独立学習記録関連

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CreateStudyLogUseCase } from "../../../domain/usecases/CreateStudyLog.js";
import { StudyLogRepository } from "../../database/repositories/StudyLogRepository.js";

// バリデーションスキーマ
const createStudyLogSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  subject: z.string().min(1, "科目は必須です"),
  topics: z.array(z.string()).min(1, "学習項目は1つ以上必要です"),
  studyTime: z.number().min(1, "学習時間は1分以上必要です"),
  understanding: z.number().min(1).max(5, "理解度は1-5の範囲で入力してください"),
  memo: z.string().optional().default("")
});

const updateStudyLogSchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  subject: z.string().min(1).optional(),
  topics: z.array(z.string()).min(1).optional(),
  studyTime: z.number().min(1).optional(),
  understanding: z.number().min(1).max(5).optional(),
  memo: z.string().optional()
});

const dateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

export function createStudyLogRoutes(
  createStudyLogUseCase: CreateStudyLogUseCase,
  studyLogRepository: StudyLogRepository
) {
  const app = new Hono();

  // POST /api/studylog - 学習記録作成
  app.post("/", zValidator("json", createStudyLogSchema as any), async (c) => {
    try {
      const studyLogData = c.req.valid("json");
      const studyLog = await createStudyLogUseCase.execute(studyLogData);

      return c.json({
        success: true,
        data: {
          id: studyLog.id,
          date: studyLog.date,
          subject: studyLog.subject,
          topics: studyLog.topics,
          studyTime: studyLog.studyTime,
          understanding: studyLog.understanding,
          memo: studyLog.memo,
          efficiency: studyLog.calculateEfficiency()
        },
        message: "学習記録が作成されました"
      }, 201);
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "学習記録の作成に失敗しました"
      }, 400);
    }
  });

  // GET /api/studylog - 全学習記録取得
  app.get("/", async (c) => {
    try {
      const studyLogs = await studyLogRepository.findAll();

      return c.json({
        success: true,
        data: studyLogs.map(log => ({
          id: log.id,
          date: log.date,
          subject: log.subject,
          topics: log.topics,
          studyTime: log.studyTime,
          understanding: log.understanding,
          memo: log.memo,
          efficiency: log.calculateEfficiency()
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "学習記録の取得に失敗しました"
      }, 500);
    }
  });

  // GET /api/studylog/:id - 特定の学習記録取得
  app.get("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const studyLog = await studyLogRepository.findById(id);

      if (!studyLog) {
        return c.json({
          success: false,
          error: "学習記録が見つかりません"
        }, 404);
      }

      return c.json({
        success: true,
        data: {
          id: studyLog.id,
          date: studyLog.date,
          subject: studyLog.subject,
          topics: studyLog.topics,
          studyTime: studyLog.studyTime,
          understanding: studyLog.understanding,
          memo: studyLog.memo,
          efficiency: studyLog.calculateEfficiency()
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "学習記録の取得に失敗しました"
      }, 500);
    }
  });

  // PUT /api/studylog/:id - 学習記録更新
  app.put("/:id", zValidator("json", updateStudyLogSchema as any), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const updates = c.req.valid("json");

      // 既存の記録を取得
      const existingLog = await studyLogRepository.findById(id);
      if (!existingLog) {
        return c.json({
          success: false,
          error: "学習記録が見つかりません"
        }, 404);
      }

      // 更新データを作成（既存値をベースに更新）
      const updatedData = {
        id: existingLog.id!,
        date: updates.date || existingLog.date,
        subject: updates.subject || existingLog.subject,
        topics: updates.topics || existingLog.topics,
        studyTime: updates.studyTime !== undefined ? updates.studyTime : existingLog.studyTime,
        understanding: updates.understanding !== undefined ? updates.understanding : existingLog.understanding,
        memo: updates.memo !== undefined ? updates.memo : existingLog.memo
      };

      // 新しいエンティティを作成して保存
      const updatedLog = await createStudyLogUseCase.execute(updatedData);

      return c.json({
        success: true,
        data: {
          id: updatedLog.id,
          date: updatedLog.date,
          subject: updatedLog.subject,
          topics: updatedLog.topics,
          studyTime: updatedLog.studyTime,
          understanding: updatedLog.understanding,
          memo: updatedLog.memo,
          efficiency: updatedLog.calculateEfficiency()
        },
        message: "学習記録が更新されました"
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "学習記録の更新に失敗しました"
      }, 400);
    }
  });

  // DELETE /api/studylog/:id - 学習記録削除
  app.delete("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      
      // 記録が存在するか確認
      const existingLog = await studyLogRepository.findById(id);
      if (!existingLog) {
        return c.json({
          success: false,
          error: "学習記録が見つかりません"
        }, 404);
      }

      await studyLogRepository.deleteById(id);

      return c.json({
        success: true,
        message: "学習記録が削除されました"
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "学習記録の削除に失敗しました"
      }, 500);
    }
  });

  // GET /api/studylog/date-range - 期間指定で学習記録取得
  app.post("/date-range", zValidator("json", dateRangeSchema as any), async (c) => {
    try {
      const { startDate, endDate } = c.req.valid("json");
      const studyLogs = await studyLogRepository.findByDateRange(startDate, endDate);

      return c.json({
        success: true,
        data: studyLogs.map(log => ({
          id: log.id,
          date: log.date,
          subject: log.subject,
          topics: log.topics,
          studyTime: log.studyTime,
          understanding: log.understanding,
          memo: log.memo,
          efficiency: log.calculateEfficiency()
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "期間指定での学習記録取得に失敗しました"
      }, 400);
    }
  });

  // GET /api/studylog/subject/:subject - 科目別学習記録取得
  app.get("/subject/:subject", async (c) => {
    try {
      const subject = c.req.param("subject");
      const studyLogs = await studyLogRepository.findBySubject(subject);

      return c.json({
        success: true,
        data: studyLogs.map(log => ({
          id: log.id,
          date: log.date,
          subject: log.subject,
          topics: log.topics,
          studyTime: log.studyTime,
          understanding: log.understanding,
          memo: log.memo,
          efficiency: log.calculateEfficiency()
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "科目別学習記録の取得に失敗しました"
      }, 500);
    }
  });

  // GET /api/studylog/stats - 学習統計取得
  app.get("/stats", async (c) => {
    try {
      const stats = await studyLogRepository.getStudyStats();
      const totalTime = await studyLogRepository.getTotalStudyTime();
      const averageUnderstanding = await studyLogRepository.getAverageUnderstanding();

      return c.json({
        success: true,
        data: {
          ...stats,
          totalTime,
          averageUnderstanding
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "学習統計の取得に失敗しました"
      }, 500);
    }
  });

  return app;
}