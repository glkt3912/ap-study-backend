import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { AnalyzeStudyData } from "src/domain/usecases/AnalyzeStudyData.js";
import { PredictExamResults } from "src/domain/usecases/PredictExamResults.js";
import { GenerateReviewSchedule } from "src/domain/usecases/GenerateReviewSchedule.js";
import { StudyLogRepository } from "src/infrastructure/database/repositories/StudyLogRepository.js";
import { AnalysisRepository } from "src/infrastructure/database/repositories/AnalysisRepository.js";
import { PredictionRepository } from "src/infrastructure/database/repositories/PredictionRepository.js";
import { ReviewRepository } from "src/infrastructure/database/repositories/ReviewRepository.js";

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

  // GET /api/analysis/performance-metrics - 総合学習指標
  routes.get("/performance-metrics", async (c) => {
    try {
      const userId = c.req.header("X-User-ID") || c.req.query("userId") || "anonymous";
      const period = parseInt(c.req.query("period") || "30");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      // 学習継続性指標
      const studyConsistency = await prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as study_days,
          COUNT(*) as total_sessions,
          AVG(session_duration) as avg_session_duration,
          ROUND(COUNT(DISTINCT DATE(created_at)) * 100.0 / ${period}, 2) as consistency_rate
        FROM quiz_sessions 
        WHERE user_id = ${userId} 
          AND is_completed = true
          AND completed_at >= ${startDate.toISOString()}
      `;

      // 学習効率指標
      const learningEfficiency = await prisma.$queryRaw`
        SELECT 
          AVG(score) as avg_score,
          AVG(avg_time_per_q) as avg_time_per_question,
          COUNT(*) as total_questions_attempted,
          AVG(total_time) as avg_total_time
        FROM quiz_sessions 
        WHERE user_id = ${userId} 
          AND is_completed = true
          AND completed_at >= ${startDate.toISOString()}
      `;

      // 成長率分析
      const growthAnalysis = await prisma.$queryRaw`
        WITH weekly_performance AS (
          SELECT 
            DATE_TRUNC('week', completed_at) as week_start,
            AVG(score) as avg_score,
            COUNT(*) as sessions_count
          FROM quiz_sessions 
          WHERE user_id = ${userId} 
            AND is_completed = true
            AND completed_at >= ${startDate.toISOString()}
          GROUP BY DATE_TRUNC('week', completed_at)
          ORDER BY week_start
        )
        SELECT 
          week_start,
          avg_score,
          sessions_count,
          LAG(avg_score) OVER (ORDER BY week_start) as prev_week_score,
          (avg_score - LAG(avg_score) OVER (ORDER BY week_start)) as score_change
        FROM weekly_performance
      `;

      // カテゴリバランス分析
      const categoryBalance = await prisma.$queryRaw`
        SELECT 
          q.category,
          COUNT(*) as questions_attempted,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as proportion
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= ${startDate.toISOString()}
        GROUP BY q.category
        ORDER BY questions_attempted DESC
      `;

      return c.json({
        success: true,
        data: {
          period,
          studyConsistency: (studyConsistency as any[])[0],
          learningEfficiency: (learningEfficiency as any[])[0],
          growthAnalysis,
          categoryBalance,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "学習指標の取得に失敗しました",
        },
        500
      );
    }
  });

  // POST /api/analysis/exam-readiness - 試験準備度評価
  routes.post("/exam-readiness", async (c) => {
    try {
      const userId = c.req.header("X-User-ID") || "anonymous";
      const body = await c.req.json();
      const { examDate, targetScore = 60 } = body;

      if (!examDate) {
        return c.json(
          { success: false, error: "試験日の指定が必要です" },
          400
        );
      }

      const examDateTime = new Date(examDate);
      const daysToExam = Math.ceil((examDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      // 現在の実力評価
      const currentAbility = await prisma.$queryRaw`
        SELECT 
          AVG(score) as current_avg_score,
          COUNT(*) as total_sessions,
          AVG(CASE WHEN score >= ${targetScore} THEN 1.0 ELSE 0.0 END) as target_achievement_rate
        FROM quiz_sessions 
        WHERE user_id = ${userId} 
          AND is_completed = true
          AND completed_at >= CURRENT_DATE - INTERVAL '14 days'
      `;

      // カテゴリ別準備度
      const categoryReadiness = await prisma.$queryRaw`
        SELECT 
          q.category,
          COUNT(*) as questions_attempted,
          AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          CASE 
            WHEN AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 'excellent'
            WHEN AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) >= 0.6 THEN 'good'
            WHEN AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) >= 0.4 THEN 'needs_improvement'
            ELSE 'critical'
          END as readiness_level
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.user_id = ${userId}
          AND ua.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY q.category
        HAVING COUNT(*) >= 5
        ORDER BY accuracy_rate ASC
      `;

      // 学習推奨計画
      const studyRecommendations = [];
      const currentScore = (currentAbility as any[])[0]?.current_avg_score || 0;
      const scoreGap = targetScore - currentScore;

      if (scoreGap > 0) {
        const dailyStudyTime = Math.max(60, Math.min(scoreGap * 10, 180)); // 60-180分
        studyRecommendations.push({
          type: "daily_study_time",
          recommendation: `1日${dailyStudyTime}分の学習を推奨`,
          priority: "high"
        });
      }

      // 弱点カテゴリの改善提案
      const weakCategories = (categoryReadiness as any[]).filter(cat => cat.accuracy_rate < 0.6);
      if (weakCategories.length > 0) {
        studyRecommendations.push({
          type: "focus_areas",
          recommendation: `重点強化: ${weakCategories.map(cat => cat.category).join(', ')}`,
          priority: "high"
        });
      }

      // 総合評価
      let overallReadiness = "good";
      if (currentScore < targetScore * 0.7) {
        overallReadiness = "needs_significant_improvement";
      } else if (currentScore < targetScore * 0.9) {
        overallReadiness = "needs_improvement";
      } else if (currentScore >= targetScore) {
        overallReadiness = "excellent";
      }

      return c.json({
        success: true,
        data: {
          examDate,
          daysToExam,
          targetScore,
          currentAbility: (currentAbility as any[])[0],
          categoryReadiness,
          overallReadiness,
          studyRecommendations,
          passProbability: Math.min(95, Math.max(5, currentScore * 1.5)),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "試験準備度評価に失敗しました",
        },
        400
      );
    }
  });

  // GET /api/analysis/learning-pattern - 学習パターン分析
  routes.get("/learning-pattern", async (c) => {
    try {
      const userId = c.req.header("X-User-ID") || c.req.query("userId") || "anonymous";

      // 学習時間帯分析
      const timePattern = await prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM created_at) as study_hour,
          COUNT(*) as session_count,
          AVG(score) as avg_score,
          AVG(total_time) as avg_duration
        FROM quiz_sessions 
        WHERE user_id = ${userId} 
          AND is_completed = true
        GROUP BY EXTRACT(HOUR FROM created_at)
        HAVING COUNT(*) >= 3
        ORDER BY study_hour ASC
      `;

      // 学習頻度パターン
      const frequencyPattern = await prisma.$queryRaw`
        SELECT 
          EXTRACT(DOW FROM completed_at) as day_of_week,
          COUNT(*) as session_count,
          AVG(score) as avg_score
        FROM quiz_sessions 
        WHERE user_id = ${userId} 
          AND is_completed = true
        GROUP BY EXTRACT(DOW FROM completed_at)
        ORDER BY day_of_week ASC
      `;

      // 学習量と成果の相関
      const volumePerformanceCorrelation = await prisma.$queryRaw`
        WITH daily_stats AS (
          SELECT 
            DATE(completed_at) as study_date,
            COUNT(*) as daily_sessions,
            SUM(total_questions) as daily_questions,
            AVG(score) as daily_avg_score
          FROM quiz_sessions 
          WHERE user_id = ${userId} 
            AND is_completed = true
            AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(completed_at)
        )
        SELECT 
          daily_sessions,
          daily_questions,
          AVG(daily_avg_score) as avg_score_for_volume,
          COUNT(*) as frequency
        FROM daily_stats
        GROUP BY daily_sessions, daily_questions
        ORDER BY daily_sessions, daily_questions
      `;

      // 最適学習条件の提案
      const bestTimeSlot = (timePattern as any[]).reduce((best, current) => 
        current.avg_score > (best?.avg_score || 0) ? current : best, null);

      const bestDayOfWeek = (frequencyPattern as any[]).reduce((best, current) => 
        current.avg_score > (best?.avg_score || 0) ? current : best, null);

      const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

      return c.json({
        success: true,
        data: {
          timePattern,
          frequencyPattern,
          volumePerformanceCorrelation,
          recommendations: {
            optimalTimeSlot: bestTimeSlot ? `${bestTimeSlot.study_hour}時台` : "データ不足",
            optimalDayOfWeek: bestDayOfWeek ? dayNames[bestDayOfWeek.day_of_week] : "データ不足",
            recommendedDailyQuestions: 15, // 分析結果に基づいて調整可能
          },
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "学習パターン分析に失敗しました",
        },
        500
      );
    }
  });

  return routes;
}
