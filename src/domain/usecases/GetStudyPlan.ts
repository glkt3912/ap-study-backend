// ユースケース: 学習計画取得

import { IStudyRepository } from "src/domain/repositories/IStudyRepository.js";
import { StudyWeekEntity } from "src/domain/entities/StudyWeek.js";

export class GetStudyPlanUseCase {
  constructor(private studyRepository: IStudyRepository) {}

  // 全週の学習計画を取得（従来メソッド - 下位互換性のため維持）
  async execute(): Promise<StudyWeekEntity[]> {
    const weeks = await this.studyRepository.findAllWeeks();

    // 初期データがない場合は作成
    if (weeks.length === 0) {
      await this.studyRepository.initializeDefaultPlan();
      return await this.studyRepository.findAllWeeks();
    }

    return weeks;
  }

  // ユーザー固有の学習計画を取得
  async executeForUser(userId: number): Promise<StudyWeekEntity[]> {
    // userId = 0 の場合（認証なし/匿名ユーザー）はデフォルトプランを返す
    if (userId === 0) {
      return this.execute();
    }

    const weeks = await this.studyRepository.findWeeksByUserId(userId);

    // ユーザー固有のデータがない場合はデフォルトプランをコピーして作成
    if (weeks.length === 0) {
      await this.studyRepository.initializeUserPlan(userId);
      return await this.studyRepository.findWeeksByUserId(userId);
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

  // ユーザー固有の特定週の計画を取得
  async getWeekForUser(userId: number, weekNumber: number): Promise<StudyWeekEntity> {
    if (weekNumber < 1 || weekNumber > 12) {
      throw new Error("週番号は1から12の間で指定してください");
    }

    // userId = 0 の場合（匿名ユーザー）はデフォルトプランを返す
    if (userId === 0) {
      return this.getWeek(weekNumber);
    }

    // ユーザーの学習計画から特定の週を取得
    const weeks = await this.studyRepository.findWeeksByUserId(userId);
    const week = weeks.find(w => w.weekNumber === weekNumber);

    if (!week) {
      // ユーザー計画がない場合は初期化して再取得
      await this.studyRepository.initializeUserPlan(userId);
      const newWeeks = await this.studyRepository.findWeeksByUserId(userId);
      const newWeek = newWeeks.find(w => w.weekNumber === weekNumber);
      
      if (!newWeek) {
        throw new Error(`第${weekNumber}週の計画が見つかりません`);
      }
      return newWeek;
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

  // ユーザー固有の現在の週を取得
  async getCurrentWeekForUser(userId: number): Promise<StudyWeekEntity> {
    // userId = 0 の場合（匿名ユーザー）はデフォルトプランを返す
    if (userId === 0) {
      return this.getCurrentWeek();
    }

    const weeks = await this.executeForUser(userId);

    // 未完了のタスクがある週を探す
    const currentWeek = weeks.find((week) =>
      week.days.some((day) => !day.completed)
    );

    // 全て完了している場合は最後の週を返す
    return currentWeek || weeks[weeks.length - 1];
  }
}
