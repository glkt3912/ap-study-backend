// リポジトリインターフェース - データアクセスの抽象化

import { StudyWeekEntity, StudyWeek } from "src/domain/entities/StudyWeek.js";

export interface IStudyRepository {
  // 学習計画の取得
  findAllWeeks(): Promise<StudyWeekEntity[]>;
  findWeekByNumber(weekNumber: number): Promise<StudyWeekEntity | null>;

  // 学習計画の更新
  updateWeek(week: StudyWeekEntity): Promise<StudyWeekEntity>;
  updateDayProgress(
    weekId: number,
    dayIndex: number,
    updates: Partial<StudyWeek["days"][0]>
  ): Promise<void>;

  // 初期データの投入
  createWeek(week: Omit<StudyWeek, "id">): Promise<StudyWeekEntity>;
  initializeDefaultPlan(): Promise<void>;

  // 統計データ
  getTotalProgress(): Promise<{
    totalDays: number;
    completedDays: number;
    totalStudyTime: number;
    averageUnderstanding: number;
  }>;
}
