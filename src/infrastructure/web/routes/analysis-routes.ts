import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

interface CategoryPerformance {
  total: number;
  correct: number;
  sessions: number;
}

interface CategoryReadiness {
  category: string;
  questions_attempted: number;
  accuracy_rate: number;
  readiness_level: 'excellent' | 'good' | 'needs_improvement' | 'critical';
}

interface StudyRecommendation {
  type: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

// Helper functions for exam readiness analysis
const validateExamDate = (examDate: string) => {
  if (!examDate) {
    throw new Error('Exam date is required');
  }

  const examDateTime = new Date(examDate);
  const currentDate = new Date();
  const daysToExam = Math.ceil((examDateTime.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysToExam <= 0) {
    throw new Error('Exam date must be in the future');
  }

  return { examDateTime, daysToExam };
};

const analyzeQuizPerformance = (quizSessions: any[]) => {
  const currentAvgScore =
    quizSessions.length > 0 ? quizSessions.reduce((sum, session) => sum + session.score, 0) / quizSessions.length : 0;

  return { currentAvgScore };
};

const analyzeCategoryPerformance = (quizSessions: any[]): CategoryReadiness[] => {
  const categoryPerformance: { [category: string]: CategoryPerformance } = {};

  quizSessions.forEach(session => {
    const category = session.category || '未分類';
    if (!categoryPerformance[category]) {
      categoryPerformance[category] = { total: 0, correct: 0, sessions: 0 };
    }
    categoryPerformance[category].total += session.totalQuestions;
    categoryPerformance[category].correct += session.correctAnswers;
    categoryPerformance[category].sessions++;
  });

  return Object.entries(categoryPerformance).map(([category, data]) => {
    const accuracy = data.total > 0 ? data.correct / data.total : 0;
    let readinessLevel: 'excellent' | 'good' | 'needs_improvement' | 'critical';

    if (accuracy >= 0.8 && data.sessions >= 5) readinessLevel = 'excellent';
    else if (accuracy >= 0.7 && data.sessions >= 3) readinessLevel = 'good';
    else if (accuracy >= 0.5 && data.sessions >= 1) readinessLevel = 'needs_improvement';
    else readinessLevel = 'critical';

    return {
      category,
      questions_attempted: data.total,
      accuracy_rate: accuracy,
      readiness_level: readinessLevel,
    };
  });
};

const calculateAvgAccuracy = (categoryReadiness: CategoryReadiness[]): number => {
  return categoryReadiness.length > 0
    ? categoryReadiness.reduce((sum, cat) => sum + cat.accuracy_rate, 0) / categoryReadiness.length
    : 0;
};

const determineOverallReadiness = (
  categoryReadiness: CategoryReadiness[],
  currentAvgScore: number,
  targetScore: number,
  daysToExam: number,
): string => {
  const avgAccuracy = calculateAvgAccuracy(categoryReadiness);

  if (avgAccuracy >= 0.8 && currentAvgScore >= targetScore && daysToExam >= 7) {
    return 'excellent';
  } else if (avgAccuracy >= 0.7 && currentAvgScore >= targetScore * 0.8) {
    return 'good';
  } else if (avgAccuracy >= 0.5 && daysToExam >= 14) {
    return 'needs_improvement';
  } else {
    return 'critical';
  }
};

const addScoreImprovementRecommendation = (
  recommendations: StudyRecommendation[],
  currentAvgScore: number,
  targetScore: number,
): void => {
  if (currentAvgScore < targetScore) {
    recommendations.push({
      type: 'score_improvement',
      recommendation: `目標点${targetScore}点に向けて、現在の平均点${Math.round(currentAvgScore)}点から${Math.round(targetScore - currentAvgScore)}点の向上が必要です`,
      priority: 'high',
    });
  }
};

const addCategoryRecommendations = (
  recommendations: StudyRecommendation[],
  categoryReadiness: CategoryReadiness[],
): void => {
  const criticalCategories = categoryReadiness.filter(cat => cat.readiness_level === 'critical');
  if (criticalCategories.length > 0) {
    recommendations.push({
      type: 'category_focus',
      recommendation: `${criticalCategories.map(cat => cat.category).join(', ')}分野の集中学習が急務です`,
      priority: 'high',
    });
  }

  const needsImprovementCategories = categoryReadiness.filter(cat => cat.readiness_level === 'needs_improvement');
  if (needsImprovementCategories.length > 0) {
    recommendations.push({
      type: 'category_improvement',
      recommendation: `${needsImprovementCategories.map(cat => cat.category).join(', ')}分野の強化を推奨します`,
      priority: 'medium',
    });
  }
};

const addTimeBasedRecommendations = (recommendations: StudyRecommendation[], daysToExam: number): void => {
  if (daysToExam <= 7) {
    recommendations.push({
      type: 'time_management',
      recommendation: '試験まで1週間を切っています。最重要分野に集中し、過去問演習を中心に学習してください',
      priority: 'high',
    });
  } else if (daysToExam <= 14) {
    recommendations.push({
      type: 'intensive_study',
      recommendation: '試験まで2週間です。弱点分野の集中学習と総復習のバランスを取りましょう',
      priority: 'medium',
    });
  }
};

const generateStudyRecommendations = (
  currentAvgScore: number,
  targetScore: number,
  categoryReadiness: CategoryReadiness[],
  daysToExam: number,
): StudyRecommendation[] => {
  const recommendations: StudyRecommendation[] = [];

  addScoreImprovementRecommendation(recommendations, currentAvgScore, targetScore);
  addCategoryRecommendations(recommendations, categoryReadiness);
  addTimeBasedRecommendations(recommendations, daysToExam);

  return recommendations;
};

const getBaseProbabilityByScore = (currentAvgScore: number, targetScore: number): number => {
  if (currentAvgScore >= targetScore * 1.1) return 90;
  else if (currentAvgScore >= targetScore) return 80;
  else if (currentAvgScore >= targetScore * 0.9) return 70;
  else if (currentAvgScore >= targetScore * 0.8) return 60;
  else if (currentAvgScore >= targetScore * 0.7) return 50;
  else if (currentAvgScore >= targetScore * 0.6) return 40;
  else return Math.max(20, (currentAvgScore / targetScore) * 60);
};

const adjustProbabilityByDays = (probability: number, daysToExam: number): number => {
  if (daysToExam > 30) probability += 10;
  else if (daysToExam <= 7) probability -= 10;

  return Math.max(0, Math.min(100, probability));
};

const calculatePassProbability = (currentAvgScore: number, targetScore: number, daysToExam: number): number => {
  const baseProbability = getBaseProbabilityByScore(currentAvgScore, targetScore);
  return adjustProbabilityByDays(baseProbability, daysToExam);
};

// Helper functions for latest analysis
const calculateBasicStats = (studyLogs: any[], quizSessions: any[]) => {
  const totalStudyTime = studyLogs.reduce((sum, log) => sum + log.studyTime, 0);
  const averageUnderstanding =
    studyLogs.length > 0 ? studyLogs.reduce((sum, log) => sum + log.understanding, 0) / studyLogs.length : 0;
  const avgQuizScore =
    quizSessions.length > 0 ? quizSessions.reduce((sum, session) => sum + session.score, 0) / quizSessions.length : 0;

  return { totalStudyTime, averageUnderstanding, avgQuizScore };
};

const calculateCategoryScores = (quizSessions: any[]) => {
  const categoryGroups = quizSessions.reduce((groups: { [key: string]: number[] }, session) => {
    const category = session.category || '未分類';
    if (!groups[category]) groups[category] = [];
    groups[category].push(session.score);
    return groups;
  }, {});

  const categoryScores: { [key: string]: number } = {};
  Object.entries(categoryGroups).forEach(([category, scores]) => {
    categoryScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  return categoryScores;
};

const identifyWeakSubjects = (categoryScores: { [key: string]: number }) => {
  return Object.entries(categoryScores)
    .filter(([_, score]) => score < 70)
    .sort(([_, a], [__, b]) => a - b)
    .slice(0, 3);
};

const generateInsightsAndRecommendations = (
  studyLogs: any[],
  quizSessions: any[],
  averageUnderstanding: number,
  weakSubjects: any[],
) => {
  const insights = [
    studyLogs.length > 0 ? '学習記録が蓄積されています' : '学習記録を開始しましょう',
    quizSessions.length > 0 ? 'クイズセッションが記録されています' : 'クイズに挑戦してみましょう',
    averageUnderstanding >= 3 ? '理解度は良好です' : '理解度の向上が必要です',
  ];

  const recommendations = [
    '定期的な学習を継続しましょう',
    '弱点分野を重点的に学習しましょう',
    '復習を含めた学習計画を立てましょう',
  ];

  if (weakSubjects.length > 0) {
    recommendations.unshift(`${weakSubjects[0][0]}分野の強化が特に重要です`);
  }

  return { insights, recommendations };
};

const buildAnalysisResponse = (
  stats: any,
  categoryScores: any,
  weakSubjects: any[],
  insights: string[],
  recommendations: string[],
  studyLogs: any[],
  quizSessions: any[],
) => {
  const { totalStudyTime, averageUnderstanding, avgQuizScore } = stats;

  return {
    id: Date.now().toString(),
    analysisDate: new Date().toISOString(),
    overallScore: Math.round(averageUnderstanding * 20 + avgQuizScore * 0.8),
    categoryScores,
    insights,
    recommendations,
    studyPattern: {
      totalStudyTime,
      averageStudyTime: studyLogs.length > 0 ? totalStudyTime / studyLogs.length : 0,
      studyFrequency: studyLogs.length,
      consistencyScore: Math.min((studyLogs.length / 30) * 100, 100),
    },
    weaknessAnalysis: {
      weakSubjects: weakSubjects.map(([subject, score]) => ({
        subject,
        understanding: score / 20,
        studyTime: 0,
        testScore: score,
        improvement: 0,
      })),
      weakTopics: [],
    },
    studyRecommendation: {
      dailyStudyTime: 60,
      weeklyGoal: 420,
      focusSubjects: weakSubjects.slice(0, 2).map(([subject]) => subject),
      reviewSchedule: [],
    },
    message:
      studyLogs.length === 0 && quizSessions.length === 0
        ? '学習データがありません。学習を開始して分析結果を確認しましょう。'
        : '実際の学習データに基づく分析結果です。',
  };
};

// Helper functions for learning pattern analysis
const analyzeHourlyPerformance = (quizSessions: any[]) => {
  const hourlyPerformance: { [hour: number]: { sessions: number; totalScore: number; totalDuration: number } } = {};

  quizSessions.forEach(session => {
    const hour = new Date(session.startedAt).getHours();
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { sessions: 0, totalScore: 0, totalDuration: 0 };
    }
    hourlyPerformance[hour].sessions++;
    hourlyPerformance[hour].totalScore += session.score;
    hourlyPerformance[hour].totalDuration += session.totalTime;
  });

  return Object.entries(hourlyPerformance)
    .map(([hour, data]) => ({
      study_hour: parseInt(hour),
      session_count: data.sessions,
      avg_score: data.sessions > 0 ? data.totalScore / data.sessions : 0,
      avg_duration: data.sessions > 0 ? data.totalDuration / data.sessions : 0,
    }))
    .sort((a, b) => a.study_hour - b.study_hour);
};

const analyzeDailyPerformance = (quizSessions: any[]) => {
  const dailyPerformance: { [day: number]: { sessions: number; totalScore: number } } = {};

  quizSessions.forEach(session => {
    const day = new Date(session.startedAt).getDay();
    if (!dailyPerformance[day]) {
      dailyPerformance[day] = { sessions: 0, totalScore: 0 };
    }
    dailyPerformance[day].sessions++;
    dailyPerformance[day].totalScore += session.score;
  });

  return Object.entries(dailyPerformance)
    .map(([day, data]) => ({
      day_of_week: parseInt(day),
      session_count: data.sessions,
      avg_score: data.sessions > 0 ? data.totalScore / data.sessions : 0,
    }))
    .sort((a, b) => a.day_of_week - b.day_of_week);
};

const analyzeStudyVolumeCorrelation = (studyLogs: any[], quizSessions: any[]) => {
  const correlations = [];

  if (studyLogs.length >= 5 && quizSessions.length >= 5) {
    // 学習時間と理解度の相関
    const avgStudyTime = studyLogs.reduce((sum, log) => sum + log.studyTime, 0) / studyLogs.length;
    const avgUnderstanding = studyLogs.reduce((sum, log) => sum + log.understanding, 0) / studyLogs.length;

    correlations.push({
      factor: '学習時間',
      correlation: avgStudyTime > 60 && avgUnderstanding > 3 ? 0.7 : 0.3,
      description: avgStudyTime > 60 ? '学習時間と理解度に正の相関があります' : '学習時間の増加が必要です',
    });
  }

  return correlations;
};

// Helper functions for performance metrics analysis
const analyzeStudyConsistency = (studyLogs: any[], period: number) => {
  const studyDays = new Set(studyLogs.map(log => log.date.toDateString())).size;
  const totalSessions = studyLogs.length;
  const avgSessionDuration =
    studyLogs.length > 0 ? studyLogs.reduce((sum, log) => sum + log.studyTime, 0) / studyLogs.length : 0;
  const consistencyRate = (studyDays / period) * 100;

  return {
    study_days: studyDays,
    total_sessions: totalSessions,
    avg_session_duration: Math.round(avgSessionDuration),
    consistency_rate: Math.round(consistencyRate * 10) / 10,
  };
};

// Helper functions for learning efficiency analysis
const processHourlyEfficiency = (studyLogs: any[]) => {
  const hourlyEfficiency: { [hour: number]: { studyTime: number[]; understanding: number[]; completionRate: number[]; count: number } } = {};

  studyLogs.forEach(log => {
    const hour = log.date.getHours();
    if (!hourlyEfficiency[hour]) {
      hourlyEfficiency[hour] = { studyTime: [], understanding: [], completionRate: [], count: 0 };
    }
    hourlyEfficiency[hour].studyTime.push(log.studyTime);
    hourlyEfficiency[hour].understanding.push(log.understanding);
    hourlyEfficiency[hour].completionRate.push(log.completed ? 1 : 0);
    hourlyEfficiency[hour].count++;
  });

  return Object.entries(hourlyEfficiency)
    .map(([hour, data]) => {
      const avgStudyTime = data.studyTime.reduce((sum, time) => sum + time, 0) / data.studyTime.length;
      const avgUnderstanding = data.understanding.reduce((sum, score) => sum + score, 0) / data.understanding.length;
      const completionRate = data.completionRate.reduce((sum, rate) => sum + rate, 0) / data.completionRate.length;
      const efficiencyScore = avgUnderstanding * 0.4 + completionRate * 100 * 0.4 + Math.min(avgStudyTime / 60, 3) * 0.2;

      return {
        hour: parseInt(hour),
        avgStudyTime,
        avgUnderstanding,
        completionRate,
        efficiencyScore: Math.round(efficiencyScore * 100) / 100,
      };
    })
    .sort((a, b) => a.hour - b.hour);
};

const processSubjectEfficiency = (studyLogs: any[]) => {
  const subjectEfficiency: { [subject: string]: { totalTime: number; understanding: number[]; completed: number; total: number } } = {};

  studyLogs.forEach(log => {
    if (!subjectEfficiency[log.subject]) {
      subjectEfficiency[log.subject] = { totalTime: 0, understanding: [], completed: 0, total: 0 };
    }
    subjectEfficiency[log.subject].totalTime += log.studyTime;
    subjectEfficiency[log.subject].understanding.push(log.understanding);
    if (log.completed) subjectEfficiency[log.subject].completed++;
    subjectEfficiency[log.subject].total++;
  });

  return Object.entries(subjectEfficiency).map(([subject, data]) => {
    const avgUnderstanding = data.understanding.reduce((sum, score) => sum + score, 0) / data.understanding.length;
    const completionRate = data.total > 0 ? data.completed / data.total : 0;
    const learningVelocity = data.totalTime > 0 ? (avgUnderstanding * data.total) / (data.totalTime / 60) : 0;
    const difficultyLevel = 5 - avgUnderstanding;

    return {
      subject,
      totalStudyTime: data.totalTime,
      avgUnderstanding,
      completionRate,
      difficultyLevel,
      learningVelocity: Math.round(learningVelocity * 100) / 100,
    };
  });
};

const generateEfficiencyRecommendations = (hourlyData: any[], subjectData: any[], studyLogs: any[]) => {
  const recommendations = [];

  const bestHour = hourlyData.length > 0 
    ? hourlyData.reduce((best, current) => current.efficiencyScore > best.efficiencyScore ? current : best)
    : null;

  if (bestHour) {
    recommendations.push({
      type: 'time_optimization',
      priority: 'high',
      title: '最適学習時間帯の活用',
      description: `${bestHour.hour}時台の学習効率が最も高いです。この時間帯を重点的に活用しましょう。`,
      expectedImprovement: 15,
    });
  }

  const strugglingSubject = subjectData.length > 0 
    ? subjectData.reduce((worst, current) => current.learningVelocity < worst.learningVelocity ? current : worst)
    : null;

  if (strugglingSubject && strugglingSubject.learningVelocity < 1) {
    recommendations.push({
      type: 'subject_focus',
      priority: 'medium', 
      title: '苦手分野の集中強化',
      description: `${strugglingSubject.subject}の学習効率が低下しています。学習方法の見直しや基礎固めを推奨します。`,
      expectedImprovement: 20,
    });
  }

  const avgDailyStudyTime = studyLogs.reduce((sum, log) => sum + log.studyTime, 0) / 
    Math.max(1, new Set(studyLogs.map(log => log.date.toDateString())).size);

  if (avgDailyStudyTime < 60) {
    recommendations.push({
      type: 'schedule_adjustment',
      priority: 'medium',
      title: '学習時間の増加', 
      description: '現在の学習時間は目標よりも少なめです。1日60分以上の学習時間確保を推奨します。',
      expectedImprovement: 25,
    });
  } else if (avgDailyStudyTime > 180) {
    recommendations.push({
      type: 'schedule_adjustment',
      priority: 'low',
      title: '学習時間の最適化',
      description: '長時間学習は効率低下の原因となることがあります。休憩を含めた計画的な学習を心がけましょう。',
      expectedImprovement: 10,
    });
  }

  return recommendations;
};

const calculateOverallEfficiencyScore = (hourlyData: any[], subjectData: any[], studyLogs: any[]) => {
  if (hourlyData.length === 0 || subjectData.length === 0) return 0;
  
  const hourlyScore = hourlyData.reduce((sum, data) => sum + data.efficiencyScore, 0) / hourlyData.length;
  const subjectScore = subjectData.reduce((sum, data) => sum + data.learningVelocity * 10, 0) / subjectData.length;
  const completionScore = (studyLogs.filter(log => log.completed).length / Math.max(1, studyLogs.length)) * 100;
  
  return Math.round(hourlyScore * 0.4 + subjectScore * 0.4 + completionScore * 0.2);
};

const analyzeLearningEfficiency = (quizSessions: any[]) => {
  const totalQuestions = quizSessions.reduce((sum, session) => sum + session.totalQuestions, 0);
  const avgScore =
    quizSessions.length > 0 ? quizSessions.reduce((sum, session) => sum + session.score, 0) / quizSessions.length : 0;
  const avgTimePerQuestion =
    quizSessions.length > 0 && totalQuestions > 0
      ? quizSessions.reduce((sum, session) => sum + session.totalTime, 0) / totalQuestions
      : 0;
  const avgSessionDuration =
    quizSessions.length > 0
      ? quizSessions.reduce((sum, session) => sum + session.totalTime, 0) / quizSessions.length
      : 0;

  return {
    avg_score: Math.round(avgScore * 10) / 10,
    avg_time_per_question: Math.round(avgTimePerQuestion),
    total_questions_attempted: totalQuestions,
    avg_total_time: Math.round(avgSessionDuration),
  };
};

const analyzeCategoryBalance = (categoryStats: any[]) => {
  const totalCategoryQuestions = categoryStats.reduce((sum, cat) => sum + (cat._sum.totalQuestions || 0), 0);

  return categoryStats.map(cat => ({
    category: cat.category || '未分類',
    questions_attempted: cat._sum.totalQuestions || 0,
    accuracy_rate: cat._sum.totalQuestions ? (cat._sum.correctAnswers || 0) / cat._sum.totalQuestions : 0,
    proportion: totalCategoryQuestions > 0 ? ((cat._sum.totalQuestions || 0) / totalCategoryQuestions) * 100 : 0,
  }));
};

const processWeeklyGrowthAnalysis = (weeklyStats: any[]) => {
  const weeklyGroups: { [key: string]: number[] } = {};

  weeklyStats.forEach(session => {
    const weekStart = new Date(session.startedAt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
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
        prev_week_score: 0,
        score_change: 0,
      };
    })
    .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime());

  // 前週比較の計算
  for (let i = 1; i < growthAnalysis.length; i++) {
    growthAnalysis[i].prev_week_score = growthAnalysis[i - 1].avg_score;
    growthAnalysis[i].score_change = growthAnalysis[i].avg_score - growthAnalysis[i - 1].avg_score;
  }

  return growthAnalysis;
};

export function createAnalysisRoutes(prisma: PrismaClient) {
  const routes = new Hono();

  // GET /api/analysis/performance-metrics - 総合学習指標
  routes.get('/performance-metrics', async c => {
    try {
      const period = parseInt(c.req.query('period') || '30');
      const userId = parseInt(c.req.query('userId') || '1');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      // データ取得
      const studyLogs = await prisma.studyLog.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      });

      const quizSessions = await prisma.quizSession.findMany({
        where: { userId, startedAt: { gte: startDate }, isCompleted: true },
      });

      const categoryStats = await prisma.quizSession.groupBy({
        by: ['category'],
        where: { userId, startedAt: { gte: startDate }, isCompleted: true, category: { not: null } },
        _count: { id: true },
        _sum: { totalQuestions: true, correctAnswers: true },
      });

      const weeklyStats = await prisma.quizSession.findMany({
        where: { userId, startedAt: { gte: startDate }, isCompleted: true },
        select: { startedAt: true, score: true },
        orderBy: { startedAt: 'asc' },
      });

      // 分析実行
      const studyConsistency = analyzeStudyConsistency(studyLogs, period);
      const learningEfficiency = analyzeLearningEfficiency(quizSessions);
      const categoryBalance = analyzeCategoryBalance(categoryStats);
      const growthAnalysis = processWeeklyGrowthAnalysis(weeklyStats);

      return c.json({
        success: true,
        data: {
          period,
          studyConsistency,
          learningEfficiency,
          growthAnalysis,
          categoryBalance,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Performance metrics calculation failed',
        },
        500,
      );
    }
  });

  // GET /api/analysis/latest - 最新の分析結果取得
  routes.get('/latest', async c => {
    try {
      const userId = parseInt(c.req.query('userId') || '1');

      // 最新の分析結果を取得
      const latestAnalysis = await prisma.analysisResult.findFirst({
        where: { userId },
        orderBy: { analysisDate: 'desc' },
      });

      if (latestAnalysis) {
        return c.json({
          success: true,
          data: {
            id: latestAnalysis.id,
            analysisDate: latestAnalysis.analysisDate.toISOString(),
            overallScore: latestAnalysis.overallScore,
            studyPattern: latestAnalysis.studyPattern,
            weaknessAnalysis: latestAnalysis.weaknessAnalysis,
            studyRecommendation: latestAnalysis.studyRecommendation,
          },
        });
      }

      // データがない場合は学習データから基本的な分析を生成
      const studyLogs = await prisma.studyLog.findMany({
        where: { userId },
        take: 30,
        orderBy: { date: 'desc' },
      });

      const quizSessions = await prisma.quizSession.findMany({
        where: { userId, isCompleted: true },
        take: 20,
        orderBy: { startedAt: 'desc' },
      });

      const stats = calculateBasicStats(studyLogs, quizSessions);
      const categoryScores = calculateCategoryScores(quizSessions);
      const weakSubjects = identifyWeakSubjects(categoryScores);
      const { insights, recommendations } = generateInsightsAndRecommendations(
        studyLogs,
        quizSessions,
        stats.averageUnderstanding,
        weakSubjects,
      );
      const responseData = buildAnalysisResponse(
        stats,
        categoryScores,
        weakSubjects,
        insights,
        recommendations,
        studyLogs,
        quizSessions,
      );

      return c.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Analysis retrieval failed',
        },
        500,
      );
    }
  });

  // Helper functions for learning pattern analysis
  const fetchLearningData = async (userId: number) => {
    const studyLogs = await prisma.studyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const quizSessions = await prisma.quizSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return { studyLogs, quizSessions };
  };

  const generateRecommendations = (timePattern: any[], frequencyPattern: any[]) => {
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const bestTimeSlot = timePattern.length > 0
      ? timePattern.reduce((best, current) => (current.avg_score > best.avg_score ? current : best))
      : null;
    const bestDayOfWeek = frequencyPattern.length > 0
      ? frequencyPattern.reduce((best, current) => (current.avg_score > best.avg_score ? current : best))
      : null;

    return {
      optimalTimeSlot: bestTimeSlot ? `${bestTimeSlot.study_hour}時` : 'データ不足',
      optimalDayOfWeek: bestDayOfWeek ? dayNames[bestDayOfWeek.day_of_week] : 'データ不足',
      recommendedDailyQuestions: 20,
    };
  };

  const calculateStudyMetrics = (studyLogs: any[], studyStats: any) => {
    return {
      totalStudyTime: studyStats.totalStudyTime,
      averageStudyTime: studyLogs.length > 0 ? studyStats.totalStudyTime / studyLogs.length : 0,
      studyFrequency: new Set(studyLogs.map(log => log.date.toDateString())).size,
      consistencyScore: studyLogs.length > 0 ? Math.min((studyLogs.length / 30) * 100, 100) : 0,
    };
  };

  const createPatternMessage = (studyLogs: any[], quizSessions: any[]) => {
    return studyLogs.length === 0 && quizSessions.length === 0
      ? '学習データが蓄積されると、詳細なパターン分析を提供します。'
      : '実際の学習データに基づくパターン分析結果です。';
  };

  // GET /api/analysis/learning-pattern - 学習パターン分析取得
  routes.get('/learning-pattern', async c => {
    try {
      const userId = parseInt(c.req.query('userId') || '1');
      const { studyLogs, quizSessions } = await fetchLearningData(userId);

      const timePattern = analyzeHourlyPerformance(quizSessions);
      const frequencyPattern = analyzeDailyPerformance(quizSessions);
      const volumeCorrelations = analyzeStudyVolumeCorrelation(studyLogs, quizSessions);
      const recommendations = generateRecommendations(timePattern, frequencyPattern);

      const studyStats = calculateBasicStats(studyLogs, []);
      const metrics = calculateStudyMetrics(studyLogs, studyStats);

      return c.json({
        success: true,
        data: {
          timePattern,
          frequencyPattern,
          volumePerformanceCorrelation: volumeCorrelations,
          recommendations,
          ...metrics,
          message: createPatternMessage(studyLogs, quizSessions),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Learning pattern analysis failed',
        },
        500,
      );
    }
  });

  // POST /api/analysis/exam-readiness - 試験準備度評価
  routes.post('/exam-readiness', async c => {
    try {
      const body = await c.req.json();
      const { examDate, targetScore = 60 } = body;
      const userId = parseInt(c.req.query('userId') || '1');

      const { examDateTime, daysToExam } = validateExamDate(examDate);

      // 最近30日間のクイズセッションを分析
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);

      const quizSessions = await prisma.quizSession.findMany({
        where: {
          userId,
          startedAt: { gte: recentDate },
          isCompleted: true,
        },
      });

      const { currentAvgScore } = analyzeQuizPerformance(quizSessions);
      const targetAchievementRate = targetScore > 0 ? (currentAvgScore / targetScore) * 100 : 0;

      const categoryReadiness = analyzeCategoryPerformance(quizSessions);
      const overallReadiness = determineOverallReadiness(categoryReadiness, currentAvgScore, targetScore, daysToExam);
      const studyRecommendations = generateStudyRecommendations(
        currentAvgScore,
        targetScore,
        categoryReadiness,
        daysToExam,
      );
      const passProbability = calculatePassProbability(currentAvgScore, targetScore, daysToExam);

      return c.json({
        success: true,
        data: {
          examDate: examDateTime.toISOString(),
          daysToExam,
          targetScore,
          currentAbility: {
            current_avg_score: Math.round(currentAvgScore * 10) / 10,
            total_sessions: quizSessions.length,
            target_achievement_rate: Math.round(targetAchievementRate * 10) / 10,
          },
          categoryReadiness,
          overallReadiness,
          studyRecommendations,
          passProbability: Math.round(passProbability),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Exam readiness evaluation failed',
        },
        500,
      );
    }
  });

  // POST /api/analysis/learning-efficiency - 学習効率分析生成
  routes.post('/learning-efficiency', async c => {
    try {
      const body = await c.req.json();
      const { userId = '1', timeRange } = body;
      const userIdNum = parseInt(userId);

      let startDate: Date, endDate: Date;
      if (timeRange?.startDate && timeRange?.endDate) {
        startDate = new Date(timeRange.startDate);
        endDate = new Date(timeRange.endDate);
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      const studyLogs = await prisma.studyLog.findMany({
        where: { userId: userIdNum, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' },
      });

      const hourlyEfficiencyData = processHourlyEfficiency(studyLogs);
      const subjectEfficiencyData = processSubjectEfficiency(studyLogs);
      const recommendations = generateEfficiencyRecommendations(hourlyEfficiencyData, subjectEfficiencyData, studyLogs);
      const overallScore = calculateOverallEfficiencyScore(hourlyEfficiencyData, subjectEfficiencyData, studyLogs);

      const analysisResult = {
        id: Date.now().toString(),
        userId: userId,
        analysisDate: new Date().toISOString(),
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        hourlyEfficiency: hourlyEfficiencyData,
        subjectEfficiency: subjectEfficiencyData,
        recommendations,
        overallScore: Math.max(0, Math.min(100, overallScore)),
      };

      return c.json({
        success: true,
        data: analysisResult,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Learning efficiency analysis failed',
        },
        500,
      );
    }
  });

  return routes;
}
