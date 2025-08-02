// ユースケース: 学習計画取得

import { IStudyRepository } from "../repositories/IStudyRepository.js";
import { StudyWeekEntity } from "../entities/StudyWeek.js";

export class GetStudyPlanUseCase {
  constructor(private studyRepository: IStudyRepository) {}

  // 全週の学習計画を取得
  async execute(): Promise<StudyWeekEntity[]> {
    const weeks = await this.studyRepository.findAllWeeks();

    // 初期データがない場合は作成
    if (weeks.length === 0) {
      await this.studyRepository.initializeDefaultPlan();
      return await this.studyRepository.findAllWeeks();
    }

    return weeks;
  }

  // 特定の週の計画を取得
  async getWeek(weekNumber: number): Promise<StudyWeekEntity> {
    if (weekNumber < 1 || weekNumber > 12) {
      throw new Error("週番号は1から12の間で指定してください");
    }

    const week = await this.studyRepository.findWeekByNumber(weekNumber);
    if (!week) {
      throw new Error(`第${weekNumber}週の計画が見つかりません`);
    }

    return week;
  }

  // 現在の週を取得（未完了のタスクがある最初の週）
  async getCurrentWeek(): Promise<StudyWeekEntity> {
    const weeks = await this.execute();

    // 未完了のタスクがある週を探す
    const currentWeek = weeks.find((week) =>
      week.days.some((day) => !day.completed)
    );

    // 全て完了している場合は最後の週を返す
    return currentWeek || weeks[weeks.length - 1];
  }
}
