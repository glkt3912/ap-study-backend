// 学習記録リポジトリインターフェース

import { StudyLogEntity, StudyLogData } from "src/domain/entities/StudyLog.js";

export interface IStudyLogRepository {
  // 基本CRUD
  create(studyLog: Omit<StudyLogData, "id">): Promise<StudyLogEntity>;
  findById(id: number): Promise<StudyLogEntity | null>;
  findAll(): Promise<StudyLogEntity[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<StudyLogEntity[]>;
  findByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<StudyLogEntity[]>;
  findBySubject(subject: string): Promise<StudyLogEntity[]>;

  // 統計・分析
  getTotalStudyTime(): Promise<number>;
  getAverageUnderstanding(): Promise<number>;
  getStudyStats(): Promise<{
    totalLogs: number;
    totalTime: number;
    averageUnderstanding: number;
    mostStudiedSubject: string;
  }>;

  // 削除
  deleteById(id: number): Promise<void>;
}
