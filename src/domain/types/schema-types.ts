/**
 * Prismaスキーマで使用するJSON型の型定義
 * データベースのJSON型フィールドの型安全性を向上させる
 */

// 学習計画設定
export interface StudyPlanSettings {
  reminderEnabled?: boolean;
  weeklyGoalHours?: number;
  adaptiveMode?: boolean;
  preferences?: {
    [key: string]: any;
  };
}

// 学習パターンデータ
export interface StudyPatternData {
  timeDistribution: {
    [timeSlot: string]: number; // 時間帯別学習時間
  };
  subjectDistribution: {
    [subject: string]: number; // 科目別学習時間
  };
  weeklyConsistency: number; // 週間継続率
  dailyAverageMinutes: number; // 1日平均学習時間
}

// 弱点分析データ
export interface WeaknessAnalysisData {
  overallWeakness: number; // 全体弱点レベル (0-100)
  weakAreas: string[]; // 弱点分野一覧
  improvement: {
    [area: string]: number; // 分野別改善度
  };
  priorityAreas: string[]; // 重点対策分野
}

// 学習推奨データ
export interface StudyRecommendationData {
  summary: string; // 推奨事項サマリー
  strongAreas: string[]; // 得意分野
  actions: Array<{
    type: 'study_time' | 'focus_area' | 'method';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// 合格確率データ
export interface PassProbabilityData {
  overall: number; // 全体合格確率 (0-100)
  byCategory: {
    [category: string]: number; // カテゴリ別合格確率
  };
  confidenceLevel: number; // 信頼度レベル
}

// 学習時間予測データ
export interface StudyTimePredictionData {
  totalHoursNeeded: number; // 必要総学習時間
  remainingHours: number; // 残り必要時間
  bySubject: {
    [subject: string]: number; // 科目別必要時間
  };
  dailyRecommendedMinutes: number; // 推奨1日学習時間
}

// スコア予測データ
export interface ScorePredictionData {
  predictedScore: number; // 予測スコア
  scoreRange: {
    min: number;
    max: number;
  };
  byCategory: {
    [category: string]: number; // カテゴリ別予測スコア
  };
}

// 試験準備度データ
export interface ExamReadinessData {
  overallReadiness: number; // 全体準備度 (0-100)
  categoryReadiness: {
    [category: string]: {
      score: number;
      level: 'excellent' | 'good' | 'needs_improvement' | 'critical';
    };
  };
  recommendations: string[]; // 推奨対策
}

// 学習計画テンプレート機能
export interface StudyPlanTemplateFeatures {
  hasWeeklyGoals: boolean;
  hasDailyTasks: boolean;
  hasProgressTracking: boolean;
  hasAdaptiveDifficulty: boolean;
  supportedSubjects: string[];
}

// 週間パターンデータ
export interface WeeklyPatternData {
  [day: string]: Array<{
    startTime: string;
    endTime: string;
    subject: string;
    topics: string[];
    intensity: 'low' | 'medium' | 'high';
  }>;
}

// 通知設定
export interface NotificationPreferences {
  push: boolean;
  daily: boolean;
  email: boolean;
  weekly: boolean;
  reminderTimes?: string[];
  customSettings?: {
    [key: string]: any;
  };
}

// 型のユニオン（バリデーション用）
export type ValidJsonField =
  | string[]
  | StudyPlanSettings
  | StudyPatternData
  | WeaknessAnalysisData
  | StudyRecommendationData
  | PassProbabilityData
  | StudyTimePredictionData
  | ScorePredictionData
  | ExamReadinessData
  | StudyPlanTemplateFeatures
  | WeeklyPatternData
  | NotificationPreferences;