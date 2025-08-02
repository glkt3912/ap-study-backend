// 復習スケジュールエンティティ
export interface ReviewItem {
  id?: number;
  userId?: string;
  subject: string;
  topic: string;
  lastStudyDate: Date;
  nextReviewDate: Date;
  reviewCount: number; // 復習回数
  difficulty: number; // 難易度（1-5）
  understanding: number; // 理解度（1-5）
  priority: number; // 優先度（0-100）
  forgettingCurveStage: number; // 忘却曲線段階（1-7）
  intervalDays: number; // 復習間隔（日）
  isCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewSession {
  id?: number;
  userId?: string;
  sessionDate: Date;
  reviewItems: ReviewItem[];
  totalItems: number;
  completedItems: number;
  sessionDuration: number; // 分
  averageUnderstanding: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ForgettingCurveConfig {
  stage1: number; // 1日後
  stage2: number; // 3日後
  stage3: number; // 7日後
  stage4: number; // 14日後
  stage5: number; // 30日後
  stage6: number; // 60日後
  stage7: number; // 120日後
}
