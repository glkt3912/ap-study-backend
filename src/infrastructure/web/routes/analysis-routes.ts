import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

export function createAnalysisRoutes(prisma: PrismaClient) {
  const routes = new Hono();

  // TEST endpoint - completely isolated
  routes.get("/test", async (c) => {
    console.log("[DEBUG] TEST endpoint reached");
    return c.json({ message: "Test endpoint works", timestamp: new Date().toISOString() });
  });

  // GET /api/analysis/performance-metrics - 総合学習指標
  routes.get("/performance-metrics", async (c) => {
    console.log("[DEBUG] performance-metrics START");
    try {
      console.log("[DEBUG] performance-metrics called");
      const period = parseInt(c.req.query("period") || "30");
      console.log("[DEBUG] period:", period);
      
      // モックデータを直接返す（データベーススキーマ修正中）
      const response = {
        success: true,
        data: {
          period,
          studyConsistency: {
            study_days: 5,
            total_sessions: 12,
            avg_session_duration: 1200,
            consistency_rate: 71.4,
          },
          learningEfficiency: {
            avg_score: 75.5,
            avg_time_per_question: 45,
            total_questions_attempted: 120,
            avg_total_time: 1200,
          },
          growthAnalysis: [],
          categoryBalance: [
            {
              category: "基礎理論",
              questions_attempted: 35,
              accuracy_rate: 0.8,
              proportion: 29.2,
            },
            {
              category: "アルゴリズムとプログラミング",
              questions_attempted: 28,
              accuracy_rate: 0.7,
              proportion: 23.3,
            },
            {
              category: "コンピュータシステム",
              questions_attempted: 25,
              accuracy_rate: 0.75,
              proportion: 20.8,
            },
          ],
        },
      };
      
      console.log("[DEBUG] Returning response:", JSON.stringify(response, null, 2));
      return c.json(response);
    } catch (error) {
      console.error("[ERROR] performance-metrics error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        },
        500
      );
    }
  });

  // GET /api/analysis/latest - 最新の分析結果取得
  routes.get("/latest", async (c) => {
    console.log("[DEBUG] latest analysis endpoint called");
    
    // モックデータを返す（初期データがないため）
    const mockLatestAnalysis = {
      success: true,
      data: {
        id: Date.now().toString(),
        analysisDate: new Date().toISOString(),
        overallScore: 72,
        categoryScores: {
          "基礎理論": 75,
          "アルゴリズムとプログラミング": 68,
          "コンピュータシステム": 73,
          "技術要素": 70,
          "開発技術": 74,
          "プロジェクトマネジメント": 71,
          "サービスマネジメント": 69,
          "システム戦略": 72,
          "経営戦略": 73,
          "企業と法務": 71
        },
        insights: [
          "アルゴリズムとプログラミング分野の理解度向上が必要です",
          "基礎理論分野は順調に進捗しています",
          "継続的な学習で全体的な成績向上が期待できます"
        ],
        recommendations: [
          "データ構造とアルゴリズムの復習を重点的に行いましょう",
          "過去問演習を増やして実践力を向上させましょう",
          "弱点分野の学習計画を立てて集中学習しましょう"
        ],
        message: "初期データです。実際の学習を開始すると、より詳細な分析結果が表示されます。"
      }
    };

    console.log("[DEBUG] Returning latest analysis mock data:", JSON.stringify(mockLatestAnalysis, null, 2));
    return c.json(mockLatestAnalysis);
  });

  // GET /api/analysis/review/today - 今日の復習情報取得
  routes.get("/review/today", async (c) => {
    console.log("[DEBUG] review/today endpoint called");
    
    // モックデータを返す（初期データがないため）
    const mockReviewData = {
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        totalReviewItems: 0,
        completedReviewItems: 0,
        reviewProgress: 0,
        categories: [],
        upcomingReviews: [],
        message: "初期データがありません。学習を開始すると復習データが蓄積されます。"
      }
    };

    console.log("[DEBUG] Returning review/today mock data:", mockReviewData);
    return c.json(mockReviewData);
  });

  // GET /api/analysis/learning-pattern - 学習パターン分析取得
  routes.get("/learning-pattern", async (c) => {
    console.log("[DEBUG] learning-pattern endpoint called");
    
    // モックデータを返す（初期データがないため）
    const mockLearningPatternData = {
      success: true,
      data: {
        totalStudyTime: 0,
        averageStudyTime: 0,
        studyFrequency: 0,
        bestStudyTime: "未設定",
        consistencyScore: 0,
        studyPatterns: [],
        recommendations: [
          "学習記録を開始して、あなたの学習パターンを分析しましょう",
          "毎日同じ時間に学習することで、習慣化を図りましょう"
        ],
        message: "学習データが蓄積されると、より詳細なパターン分析を提供します。"
      }
    };

    console.log("[DEBUG] Returning learning-pattern mock data:", mockLearningPatternData);
    return c.json(mockLearningPatternData);
  });

  return routes;
}