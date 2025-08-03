import { IStudyLogRepository } from "src/domain/repositories/IStudyLogRepository.js";
import { IPredictionRepository } from "src/domain/repositories/IPredictionRepository.js";
import { IAnalysisRepository } from "src/domain/repositories/IAnalysisRepository.js";
import {
  PredictionResult,
  PassProbability,
  StudyTimePrediction,
  ScorePrediction,
  ExamReadiness,
} from "src/domain/entities/PredictionResult.js";

export class PredictExamResults {
  constructor(
    private studyLogRepository: IStudyLogRepository,
    private predictionRepository: IPredictionRepository,
    private analysisRepository: IAnalysisRepository
  ) {}

  async execute(examDate: Date, userId?: string): Promise<PredictionResult> {
    // 過去のデータを取得
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90); // 過去90日

    const studyLogs = await this.studyLogRepository.findByDateRange(
      startDate,
      endDate
    );
    const latestAnalysis = await this.analysisRepository.findLatest(userId);

    // 各種予測を実行
    const passProbability = this.predictPassProbability(
      studyLogs,
      latestAnalysis,
      examDate
    );
    const studyTimePrediction = this.predictStudyTime(
      studyLogs,
      latestAnalysis,
      examDate
    );
    const scorePrediction = this.predictScores(studyLogs, latestAnalysis);
    const examReadiness = this.assessExamReadiness(
      passProbability,
      studyTimePrediction,
      scorePrediction
    );

    const predictionResult: PredictionResult = {
      userId,
      predictionDate: new Date(),
      examDate,
      passProbability,
      studyTimePrediction,
      scorePrediction,
      examReadiness,
      modelVersion: "1.0.0",
    };

    // 予測結果を保存
    return await this.predictionRepository.save(predictionResult);
  }

  private predictPassProbability(
    studyLogs: any[],
    analysisResult: any,
    examDate: Date
  ): PassProbability {
    const now = new Date();
    const daysUntilExam = Math.ceil(
      (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let baseScore = 30; // ベーススコア
    const factors = [];

    // 学習時間による加点
    const totalStudyTime = studyLogs.reduce(
      (sum, log) => sum + log.studyTime,
      0
    );
    const avgDailyStudyTime = totalStudyTime / 90; // 分/日

    if (avgDailyStudyTime >= 180) {
      // 3時間以上
      baseScore += 35;
      factors.push({
        factor: "十分な学習時間",
        impact: 35,
        description: "平均3時間以上の学習を継続",
      });
    } else if (avgDailyStudyTime >= 120) {
      // 2時間以上
      baseScore += 25;
      factors.push({
        factor: "適切な学習時間",
        impact: 25,
        description: "平均2時間以上の学習を実施",
      });
    } else {
      factors.push({
        factor: "学習時間不足",
        impact: -10,
        description: "学習時間の増加が必要",
      });
      baseScore -= 10;
    }

    // 理解度による調整
    if (studyLogs.length > 0) {
      const avgUnderstanding =
        studyLogs.reduce((sum, log) => sum + log.understanding, 0) /
        studyLogs.length;

      if (avgUnderstanding >= 4.0) {
        baseScore += 20;
        factors.push({
          factor: "高い理解度",
          impact: 20,
          description: "平均理解度4.0以上を維持",
        });
      } else if (avgUnderstanding >= 3.0) {
        baseScore += 10;
        factors.push({
          factor: "良好な理解度",
          impact: 10,
          description: "平均理解度3.0以上を維持",
        });
      } else {
        baseScore -= 15;
        factors.push({
          factor: "理解度要改善",
          impact: -15,
          description: "理解度向上に重点を置く必要",
        });
      }
    }

    // 継続性による調整
    if (analysisResult) {
      const consistencyScore = analysisResult.studyPattern.consistencyScore;
      if (consistencyScore >= 70) {
        baseScore += 15;
        factors.push({
          factor: "継続的学習",
          impact: 15,
          description: "学習の継続性が良好",
        });
      } else if (consistencyScore < 30) {
        baseScore -= 10;
        factors.push({
          factor: "学習継続性不足",
          impact: -10,
          description: "継続的な学習習慣の確立が必要",
        });
      }
    }

    // 試験日までの期間による調整
    if (daysUntilExam < 30) {
      factors.push({
        factor: "準備期間短縮",
        impact: -5,
        description: "試験まで1ヶ月を切っています",
      });
      baseScore -= 5;
    } else if (daysUntilExam > 180) {
      factors.push({
        factor: "十分な準備期間",
        impact: 5,
        description: "十分な準備期間があります",
      });
      baseScore += 5;
    }

    const currentProbability = Math.max(0, Math.min(100, baseScore));
    const confidenceLevel =
      studyLogs.length > 30 ? 85 : Math.max(50, studyLogs.length * 2);

    return {
      currentProbability,
      targetProbability: 80,
      confidenceLevel,
      factors,
    };
  }

  private predictStudyTime(
    studyLogs: any[],
    analysisResult: any,
    examDate: Date
  ): StudyTimePrediction {
    const now = new Date();
    const daysUntilExam = Math.ceil(
      (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 現在の進捗率を推定（学習時間と理解度から）
    const totalStudyTime = studyLogs.reduce(
      (sum, log) => sum + log.studyTime,
      0
    );
    const avgUnderstanding =
      studyLogs.length > 0
        ? studyLogs.reduce((sum, log) => sum + log.understanding, 0) /
          studyLogs.length
        : 2.5;

    // 目標学習時間（応用情報技術者試験：約200-300時間）
    const targetTotalHours = 250;
    const currentProgressHours = totalStudyTime / 60;
    const currentProgress = Math.min(
      100,
      (currentProgressHours / targetTotalHours) * 100
    );

    // 理解度による効率調整
    const efficiencyMultiplier =
      avgUnderstanding >= 4 ? 0.8 : avgUnderstanding >= 3 ? 1.0 : 1.3;

    const remainingHours = Math.max(
      0,
      (targetTotalHours - currentProgressHours) * efficiencyMultiplier
    );
    const requiredDailyHours =
      daysUntilExam > 0 ? remainingHours / daysUntilExam : remainingHours;

    // 推奨学習強度を決定
    let recommendedIntensity: "low" | "medium" | "high" | "intensive";
    if (requiredDailyHours < 1.5) {
      recommendedIntensity = "low";
    } else if (requiredDailyHours < 3) {
      recommendedIntensity = "medium";
    } else if (requiredDailyHours < 5) {
      recommendedIntensity = "high";
    } else {
      recommendedIntensity = "intensive";
    }

    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(
      estimatedCompletionDate.getDate() + Math.ceil(remainingHours / 2)
    ); // 1日2時間ペース

    return {
      requiredDailyHours: Math.round(requiredDailyHours * 10) / 10,
      totalRemainingHours: Math.round(remainingHours),
      estimatedCompletionDate,
      currentProgress: Math.round(currentProgress * 10) / 10,
      recommendedIntensity,
    };
  }

  private predictScores(
    studyLogs: any[],
    analysisResult: any
  ): ScorePrediction {
    const avgUnderstanding =
      studyLogs.length > 0
        ? studyLogs.reduce((sum, log) => sum + log.understanding, 0) /
          studyLogs.length
        : 2.5;

    // 理解度から点数を予測（簡易モデル）
    const baseScore = (avgUnderstanding - 1) * 20; // 1-5 → 0-80点

    // 科目別の学習バランスを考慮
    const subjectBalance = this.calculateSubjectBalance(studyLogs);
    const balanceBonus =
      subjectBalance > 0.7 ? 10 : subjectBalance > 0.5 ? 5 : 0;

    const predictedMorningScore = Math.max(
      20,
      Math.min(100, baseScore + balanceBonus + Math.random() * 10 - 5)
    );
    const predictedAfternoonScore = Math.max(
      20,
      Math.min(100, baseScore + balanceBonus + Math.random() * 10 - 5)
    );
    const overallScore = (predictedMorningScore + predictedAfternoonScore) / 2;

    // 弱点・強化分野を特定
    const subjectStats = this.calculateSubjectStats(studyLogs);
    const weakAreas = subjectStats
      .filter((stat) => stat.understanding < 3.5)
      .map((stat) => ({
        area: stat.subject,
        currentLevel: stat.understanding,
        targetLevel: 4.0,
        improvementNeeded: Math.round((4.0 - stat.understanding) * 20),
      }));

    const strongAreas = subjectStats
      .filter((stat) => stat.understanding >= 4.0)
      .map((stat) => stat.subject);

    return {
      predictedMorningScore: Math.round(predictedMorningScore),
      predictedAfternoonScore: Math.round(predictedAfternoonScore),
      overallScore: Math.round(overallScore),
      weakAreas,
      strongAreas,
    };
  }

  private assessExamReadiness(
    passProbability: PassProbability,
    studyTime: StudyTimePrediction,
    scores: ScorePrediction
  ): ExamReadiness {
    let readinessScore = 0;
    const criticalAreas: string[] = [];
    const recommendations: string[] = [];

    // 合格確率による評価
    readinessScore += passProbability.currentProbability * 0.4;

    // 学習進捗による評価
    readinessScore += studyTime.currentProgress * 0.3;

    // 予想点数による評価
    readinessScore += scores.overallScore * 0.3;

    // 準備度レベル決定
    let readinessLevel:
      | "not_ready"
      | "needs_improvement"
      | "almost_ready"
      | "ready";

    if (readinessScore >= 80) {
      readinessLevel = "ready";
      recommendations.push(
        "現在のペースを維持し、過去問で実戦練習を積みましょう"
      );
    } else if (readinessScore >= 65) {
      readinessLevel = "almost_ready";
      recommendations.push(
        "弱点分野の集中学習を行い、模擬試験で最終調整をしましょう"
      );
    } else if (readinessScore >= 45) {
      readinessLevel = "needs_improvement";
      recommendations.push("学習時間を増やし、理解度向上に重点を置きましょう");
      criticalAreas.push("学習時間不足");
    } else {
      readinessLevel = "not_ready";
      recommendations.push("基礎から体系的な学習計画の見直しが必要です");
      criticalAreas.push("全般的な準備不足");
    }

    // 具体的な改善点を追加
    if (passProbability.currentProbability < 60) {
      criticalAreas.push("合格確率向上");
      recommendations.push("継続的な学習習慣の確立が重要です");
    }

    if (scores.weakAreas.length > 3) {
      criticalAreas.push("弱点分野が多数");
      recommendations.push("重点分野を絞って集中学習をお勧めします");
    }

    return {
      readinessLevel,
      readinessScore: Math.round(readinessScore),
      criticalAreas,
      recommendations,
    };
  }

  private calculateSubjectBalance(studyLogs: any[]): number {
    const subjectTimes = new Map<string, number>();

    studyLogs.forEach((log) => {
      const currentTime = subjectTimes.get(log.subject) || 0;
      subjectTimes.set(log.subject, currentTime + log.studyTime);
    });

    if (subjectTimes.size === 0) {return 0;}

    const times = Array.from(subjectTimes.values());
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const avgTime = totalTime / times.length;

    // 各科目の時間が平均からどれくらい離れているかを計算
    const variance =
      times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
      times.length;
    const standardDeviation = Math.sqrt(variance);

    // バランス度を0-1で返す（標準偏差が小さいほどバランスが良い）
    return Math.max(0, 1 - standardDeviation / avgTime);
  }

  private calculateSubjectStats(
    studyLogs: any[]
  ): Array<{ subject: string; understanding: number }> {
    const subjectStats = new Map<string, { total: number; count: number }>();

    studyLogs.forEach((log) => {
      if (!subjectStats.has(log.subject)) {
        subjectStats.set(log.subject, { total: 0, count: 0 });
      }
      const stats = subjectStats.get(log.subject)!;
      stats.total += log.understanding;
      stats.count++;
    });

    return Array.from(subjectStats.entries()).map(([subject, stats]) => ({
      subject,
      understanding: stats.total / stats.count,
    }));
  }
}
