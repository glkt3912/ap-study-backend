import { IStudyLogRepository } from "src/domain/repositories/IStudyLogRepository.js";
import { IAnalysisRepository } from "src/domain/repositories/IAnalysisRepository.js";
import {
  AnalysisResult,
  StudyPattern,
  WeaknessAnalysis,
  StudyRecommendation,
} from "src/domain/entities/AnalysisResult.js";

export class AnalyzeStudyData {
  constructor(
    private studyLogRepository: IStudyLogRepository,
    private analysisRepository: IAnalysisRepository
  ) {}

  async execute(userId?: string): Promise<AnalysisResult> {
    // 過去30日の学習データを取得
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const studyLogs = await this.studyLogRepository.findByDateRange(
      startDate,
      endDate
    );

    // 学習パターン分析
    const studyPattern = this.analyzeStudyPattern(studyLogs);

    // 弱点分析
    const weaknessAnalysis = this.analyzeWeaknesses(studyLogs);

    // 学習推奨事項生成
    const studyRecommendation = this.generateRecommendations(
      studyPattern,
      weaknessAnalysis
    );

    // 総合スコア算出
    const overallScore = this.calculateOverallScore(
      studyPattern,
      weaknessAnalysis
    );

    const analysisResult: AnalysisResult = {
      userId,
      analysisDate: new Date(),
      studyPattern,
      weaknessAnalysis,
      studyRecommendation,
      overallScore,
    };

    // 分析結果を保存
    return await this.analysisRepository.save(analysisResult);
  }

  private analyzeStudyPattern(studyLogs: any[]): StudyPattern {
    if (studyLogs.length === 0) {
      return {
        totalStudyTime: 0,
        averageStudyTime: 0,
        studyFrequency: 0,
        bestStudyTime: "9:00",
        consistencyScore: 0,
      };
    }

    const totalStudyTime = studyLogs.reduce(
      (sum, log) => sum + log.studyTime,
      0
    );
    const averageStudyTime = totalStudyTime / studyLogs.length;

    // 学習頻度計算（週あたりの学習日数）
    const studyDates = [
      ...new Set(studyLogs.map((log) => log.date.toDateString())),
    ];
    const studyFrequency = (studyDates.length / 30) * 7;

    // 最適学習時間帯（簡易版：理解度が高い時間帯を推定）
    const bestStudyTime = this.findBestStudyTime(studyLogs);

    // 継続性スコア（学習の規則性を評価）
    const consistencyScore = this.calculateConsistencyScore(studyLogs);

    return {
      totalStudyTime,
      averageStudyTime: Math.round(averageStudyTime),
      studyFrequency: Math.round(studyFrequency * 10) / 10,
      bestStudyTime,
      consistencyScore,
    };
  }

  private analyzeWeaknesses(studyLogs: any[]): WeaknessAnalysis {
    const subjectStats = new Map<
      string,
      {
        understanding: number[];
        studyTime: number;
        count: number;
      }
    >();

    // 科目別統計を計算
    studyLogs.forEach((log) => {
      if (!subjectStats.has(log.subject)) {
        subjectStats.set(log.subject, {
          understanding: [],
          studyTime: 0,
          count: 0,
        });
      }
      const stats = subjectStats.get(log.subject)!;
      stats.understanding.push(log.understanding);
      stats.studyTime += log.studyTime;
      stats.count++;
    });

    // 弱点科目を特定
    const weakSubjects = Array.from(subjectStats.entries())
      .map(([subject, stats]) => ({
        subject,
        understanding:
          stats.understanding.reduce((a, b) => a + b, 0) /
          stats.understanding.length,
        studyTime: stats.studyTime,
        testScore: 0, // TODO: テスト結果と連携
        improvement: 0,
      }))
      .filter((item) => item.understanding < 3.5)
      .sort((a, b) => a.understanding - b.understanding);

    // 改善必要度を計算
    weakSubjects.forEach((subject) => {
      subject.improvement = Math.round((4 - subject.understanding) * 25);
    });

    return {
      weakSubjects,
      weakTopics: [], // TODO: トピック別分析を実装
    };
  }

  private generateRecommendations(
    pattern: StudyPattern,
    weakness: WeaknessAnalysis
  ): StudyRecommendation {
    // 現在の学習時間を基に推奨時間を算出
    const dailyStudyTime = Math.max(120, pattern.averageStudyTime * 1.2); // 最低2時間
    const weeklyGoal = dailyStudyTime * 7;

    // 重点科目を決定
    const focusSubjects = weakness.weakSubjects
      .slice(0, 3)
      .map((s) => s.subject);

    // 復習スケジュール生成
    const reviewSchedule = weakness.weakSubjects.map((subject, index) => ({
      subject: subject.subject,
      nextReviewDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
      priority: subject.improvement,
    }));

    return {
      dailyStudyTime: Math.round(dailyStudyTime),
      weeklyGoal: Math.round(weeklyGoal),
      focusSubjects,
      reviewSchedule,
    };
  }

  private calculateOverallScore(
    pattern: StudyPattern,
    weakness: WeaknessAnalysis
  ): number {
    let score = 50; // ベーススコア

    // 学習時間による加点
    if (pattern.totalStudyTime > 3600) {score += 20;} // 60時間以上
    else if (pattern.totalStudyTime > 1800) {score += 10;} // 30時間以上

    // 継続性による加点
    score += pattern.consistencyScore * 0.2;

    // 弱点数による減点
    score -= weakness.weakSubjects.length * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private findBestStudyTime(studyLogs: any[]): string {
    // 簡易実装：理解度の高い学習記録の時間帯を推定
    const highUnderstandingLogs = studyLogs.filter(
      (log) => log.understanding >= 4
    );
    if (highUnderstandingLogs.length === 0) {return "9:00";}

    // 朝型学習を推奨（実際の実装では時間帯データが必要）
    return "9:00";
  }

  private calculateConsistencyScore(studyLogs: any[]): number {
    if (studyLogs.length < 7) {return 0;}

    // 学習日の分散を計算して継続性を評価
    const studyDates = studyLogs.map((log) => new Date(log.date).getDate());
    const uniqueDates = [...new Set(studyDates)];

    // 30日間で何日学習したかの割合
    const consistencyRatio = uniqueDates.length / 30;

    return Math.round(consistencyRatio * 100);
  }
}
