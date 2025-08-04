// 予測結果エンティティ
export interface PassProbability {
  currentProbability: number; // 現在の合格確率（0-100）
  targetProbability: number; // 目標合格確率（通常80%）
  confidenceLevel: number; // 予測信頼度（0-100）
  factors: Array<{
    factor: string; // 要因名
    impact: number; // 影響度（-100 to +100）
    description: string; // 説明
  }>;
}

export interface StudyTimePrediction {
  requiredDailyHours: number; // 必要な日別学習時間（時間）
  totalRemainingHours: number; // 残り必要学習時間（時間）
  estimatedCompletionDate: Date; // 予想完了日
  currentProgress: number; // 現在の進捗率（0-100）
  recommendedIntensity: 'low' | 'medium' | 'high' | 'intensive'; // 推奨学習強度
}

export interface ScorePrediction {
  predictedMorningScore: number; // 午前問題予想点数（0-100）
  predictedAfternoonScore: number; // 午後問題予想点数（0-100）
  overallScore: number; // 総合予想点数（0-100）
  weakAreas: Array<{
    area: string;
    currentLevel: number;
    targetLevel: number;
    improvementNeeded: number;
  }>;
  strongAreas: string[];
}

export interface ExamReadiness {
  readinessLevel: 'not_ready' | 'needs_improvement' | 'almost_ready' | 'ready'; // 受験準備度
  readinessScore: number; // 準備度スコア（0-100）
  criticalAreas: string[]; // 重要改善分野
  recommendations: string[]; // 具体的推奨事項
}

export interface PredictionResult {
  id?: number;
  userId?: number;
  predictionDate: Date;
  examDate: Date; // 試験日
  passProbability: PassProbability;
  studyTimePrediction: StudyTimePrediction;
  scorePrediction: ScorePrediction;
  examReadiness: ExamReadiness;
  modelVersion: string; // 予測モデルバージョン
  createdAt?: Date;
  updatedAt?: Date;
}