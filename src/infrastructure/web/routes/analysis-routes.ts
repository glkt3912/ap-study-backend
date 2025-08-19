import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

export function createAnalysisRoutes(prisma: PrismaClient) {
  const routes = new Hono();

  // GET /api/analysis/performance-metrics - 総合学習指標
  routes.get("/performance-metrics", async (c) => {
    try {
      const period = parseInt(c.req.query("period") || "30");
      const userId = parseInt(c.req.query("userId") || "1");
      
      // 期間の開始日を計算
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      
      // 学習継続性の分析
      const studyLogs = await prisma.studyLog.findMany({
        where: {
          userId,
          date: { gte: startDate }
        },
        orderBy: { date: 'asc' }
      });

      const studyDays = new Set(studyLogs.map(log => log.date.toDateString())).size;
      const totalSessions = studyLogs.length;
      const avgSessionDuration = studyLogs.length > 0 
        ? studyLogs.reduce((sum, log) => sum + log.studyTime, 0) / studyLogs.length 
        : 0;
      const consistencyRate = (studyDays / period) * 100;

      // クイズセッションから学習効率を分析
      const quizSessions = await prisma.quizSession.findMany({
        where: {
          userId,
          startedAt: { gte: startDate },
          isCompleted: true
        }
      });

      const totalQuestions = quizSessions.reduce((sum, session) => sum + session.totalQuestions, 0);
      const totalCorrect = quizSessions.reduce((sum, session) => sum + session.correctAnswers, 0);
      const avgScore = quizSessions.length > 0 
        ? quizSessions.reduce((sum, session) => sum + session.score, 0) / quizSessions.length 
        : 0;
      const avgTimePerQuestion = quizSessions.length > 0 && totalQuestions > 0
        ? quizSessions.reduce((sum, session) => sum + session.totalTime, 0) / totalQuestions
        : 0;

      // カテゴリ別バランス分析
      const categoryStats = await prisma.quizSession.groupBy({
        by: ['category'],
        where: {
          userId,
          startedAt: { gte: startDate },
          isCompleted: true,
          category: { not: null }
        },
        _count: {
          id: true
        },
        _sum: {
          totalQuestions: true,
          correctAnswers: true
        }
      });

      const totalCategoryQuestions = categoryStats.reduce((sum, cat) => sum + (cat._sum.totalQuestions || 0), 0);
      const categoryBalance = categoryStats.map(cat => ({
        category: cat.category || "未分類",
        questions_attempted: cat._sum.totalQuestions || 0,
        accuracy_rate: cat._sum.totalQuestions ? (cat._sum.correctAnswers || 0) / cat._sum.totalQuestions : 0,
        proportion: totalCategoryQuestions > 0 ? ((cat._sum.totalQuestions || 0) / totalCategoryQuestions) * 100 : 0
      }));

      // 週次成長分析
      const weeklyStats = await prisma.quizSession.findMany({
        where: {
          userId,
          startedAt: { gte: startDate },
          isCompleted: true
        },
        select: {
          startedAt: true,
          score: true
        },
        orderBy: { startedAt: 'asc' }
      });

      // 週ごとにデータをグループ化
      const weeklyGroups: { [key: string]: number[] } = {};
      weeklyStats.forEach(session => {
        const weekStart = new Date(session.startedAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 週の開始日を日曜日に設定
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyGroups[weekKey]) {
          weeklyGroups[weekKey] = [];
        }
        weeklyGroups[weekKey].push(session.score);
      });

      const growthAnalysis = Object.entries(weeklyGroups)
        .map(([weekStart, scores]) => {
          const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          return {
            week_start: weekStart,
            avg_score: avgScore,
            sessions_count: scores.length,
            prev_week_score: 0, // 前週比較は後で実装
            score_change: 0
          };
        })
        .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime());

      // 前週比較の計算
      for (let i = 1; i < growthAnalysis.length; i++) {
        growthAnalysis[i].prev_week_score = growthAnalysis[i - 1].avg_score;
        growthAnalysis[i].score_change = growthAnalysis[i].avg_score - growthAnalysis[i - 1].avg_score;
      }

      const response = {
        success: true,
        data: {
          period,
          studyConsistency: {
            study_days: studyDays,
            total_sessions: totalSessions,
            avg_session_duration: Math.round(avgSessionDuration),
            consistency_rate: Math.round(consistencyRate * 10) / 10,
          },
          learningEfficiency: {
            avg_score: Math.round(avgScore * 10) / 10,
            avg_time_per_question: Math.round(avgTimePerQuestion),
            total_questions_attempted: totalQuestions,
            avg_total_time: Math.round(avgSessionDuration),
          },
          growthAnalysis,
          categoryBalance,
        },
      };
      
      return c.json(response);
    } catch (error) {
      console.error('Performance metrics error:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Performance metrics calculation failed",
        },
        500
      );
    }
  });

  // GET /api/analysis/latest - 最新の分析結果取得
  routes.get("/latest", async (c) => {
    // 最新分析結果取得
    
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

    return c.json(mockLatestAnalysis);
  });


  // GET /api/analysis/learning-pattern - 学習パターン分析取得
  routes.get("/learning-pattern", async (c) => {
    // 学習パターン分析取得
    
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

    return c.json(mockLearningPatternData);
  });

  return routes;
}