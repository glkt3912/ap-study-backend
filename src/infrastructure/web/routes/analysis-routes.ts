import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { AnalyzeStudyData } from "../../../domain/usecases/AnalyzeStudyData.js";
import { PredictExamResults } from "../../../domain/usecases/PredictExamResults.js";
import { GenerateReviewSchedule } from "../../../domain/usecases/GenerateReviewSchedule.js";
import { StudyLogRepository } from "../../database/repositories/StudyLogRepository.js";
import { AnalysisRepository } from "../../database/repositories/AnalysisRepository.js";
import { PredictionRepository } from "../../database/repositories/PredictionRepository.js";
import { ReviewRepository } from "../../database/repositories/ReviewRepository.js";

export function createAnalysisRoutes(prisma: PrismaClient) {
  const routes = new Hono();

  // 学習分析実行
  routes.post("/analyze", async (c) => {
    try {
      const userId = c.req.query("userId"); // オプショナル

      const studyLogRepository = new StudyLogRepository(prisma);
      const analysisRepository = new AnalysisRepository(prisma);
      const analyzeStudyData = new AnalyzeStudyData(
        studyLogRepository,
        analysisRepository
      );

      const result = await analyzeStudyData.execute(userId);

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to analyze study data",
        },
        500
      );
    }
  });

  // 最新の分析結果取得
  routes.get("/latest", async (c) => {
    try {
      const userId = c.req.query("userId");
      const analysisRepository = new AnalysisRepository(prisma);

      const result = await analysisRepository.findLatest(userId);

      if (!result) {
        return c.json(
          {
            success: false,
            message: "No analysis results found",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get latest analysis error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get latest analysis",
        },
        500
      );
    }
  });

  // 期間指定分析結果取得
  routes.get("/history", async (c) => {
    try {
      const userId = c.req.query("userId");
      const startDateStr = c.req.query("startDate");
      const endDateStr = c.req.query("endDate");

      if (!startDateStr || !endDateStr) {
        return c.json(
          {
            success: false,
            error: "startDate and endDate are required",
          },
          400
        );
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      const analysisRepository = new AnalysisRepository(prisma);
      const results = await analysisRepository.findByDateRange(
        startDate,
        endDate,
        userId
      );

      return c.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Get analysis history error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get analysis history",
        },
        500
      );
    }
  });

  // 予測実行
  routes.post("/predict", async (c) => {
    try {
      const body = await c.req.json();
      const examDate = new Date(body.examDate);
      const userId = c.req.query("userId");

      const studyLogRepository = new StudyLogRepository(prisma);
      const analysisRepository = new AnalysisRepository(prisma);
      const predictionRepository = new PredictionRepository(prisma);
      const predictExamResults = new PredictExamResults(
        studyLogRepository,
        predictionRepository,
        analysisRepository
      );

      const result = await predictExamResults.execute(examDate, userId);

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Prediction error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to predict exam results",
        },
        500
      );
    }
  });

  // 最新の予測結果取得
  routes.get("/prediction/latest", async (c) => {
    try {
      const userId = c.req.query("userId");
      const predictionRepository = new PredictionRepository(prisma);

      const result = await predictionRepository.findLatest(userId);

      if (!result) {
        return c.json(
          {
            success: false,
            message: "No prediction results found",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get latest prediction error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get latest prediction",
        },
        500
      );
    }
  });

  // 試験日別予測結果取得
  routes.get("/prediction/exam/:date", async (c) => {
    try {
      const examDateStr = c.req.param("date");
      const userId = c.req.query("userId");

      const examDate = new Date(examDateStr);
      const predictionRepository = new PredictionRepository(prisma);

      const results = await predictionRepository.findByExamDate(
        examDate,
        userId
      );

      return c.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Get prediction by exam date error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get predictions by exam date",
        },
        500
      );
    }
  });

  // 復習スケジュール生成
  routes.post("/review/generate", async (c) => {
    try {
      const userId = c.req.query("userId");

      const studyLogRepository = new StudyLogRepository(prisma);
      const reviewRepository = new ReviewRepository(prisma);
      const generateReviewSchedule = new GenerateReviewSchedule(
        reviewRepository,
        studyLogRepository
      );

      const reviewItems = await generateReviewSchedule.execute(userId);

      return c.json({
        success: true,
        data: reviewItems,
      });
    } catch (error) {
      console.error("Generate review schedule error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to generate review schedule",
        },
        500
      );
    }
  });

  // 今日の復習項目取得
  routes.get("/review/today", async (c) => {
    try {
      const userId = c.req.query("userId");
      const reviewRepository = new ReviewRepository(prisma);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueItems = await reviewRepository.findDueReviewItems(today, userId);

      return c.json({
        success: true,
        data: dueItems,
      });
    } catch (error) {
      console.error("Get today review items error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get today review items",
        },
        500
      );
    }
  });

  // 復習完了
  routes.post("/review/complete/:id", async (c) => {
    try {
      const itemId = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const { understanding, studyTime } = body;

      const studyLogRepository = new StudyLogRepository(prisma);
      const reviewRepository = new ReviewRepository(prisma);
      const generateReviewSchedule = new GenerateReviewSchedule(
        reviewRepository,
        studyLogRepository
      );

      const updatedItem = await generateReviewSchedule.completeReview(
        itemId,
        understanding,
        studyTime
      );

      return c.json({
        success: true,
        data: updatedItem,
      });
    } catch (error) {
      console.error("Complete review error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to complete review",
        },
        500
      );
    }
  });

  return routes;
}
