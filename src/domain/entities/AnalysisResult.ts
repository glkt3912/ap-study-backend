// 学習分析結果エンティティ
export interface StudyPattern {
  totalStudyTime: number; // 総学習時間（分）
  averageStudyTime: number; // 平均学習時間（分/日）
  studyFrequency: number; // 学習頻度（日/週）
  bestStudyTime: string; // 最も効率的な学習時間帯
  consistencyScore: number; // 継続性スコア（0-100）
}

export interface WeaknessAnalysis {
  weakSubjects: Array<{
    subject: string;
    understanding: number; // 平均理解度（1-5）
    studyTime: number; // 学習時間（分）
    testScore: number; // テスト平均点
    improvement: number; // 改善が必要な度合い（0-100）
  }>;
  weakTopics: Array<{
    topic: string;
    subject: string;
    understanding: number;
    testAccuracy: number; // テスト正答率
    priority: number; // 優先度（0-100）
  }>;
}

export interface StudyRecommendation {
  dailyStudyTime: number; // 推奨日別学習時間（分）
  weeklyGoal: number; // 週間目標時間（分）
  focusSubjects: string[]; // 重点科目
  reviewSchedule: Array<{
    subject: string;
    nextReviewDate: Date;
    priority: number;
  }>;
}

export interface AnalysisResult {
  id?: number;
  userId?: number;
  analysisDate: Date;
  studyPattern: StudyPattern;
  weaknessAnalysis: WeaknessAnalysis;
  studyRecommendation: StudyRecommendation;
  overallScore: number; // 総合評価スコア（0-100）
  createdAt?: Date;
  updatedAt?: Date;
}