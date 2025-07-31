// ユースケース: 学習進捗更新

import { IStudyRepository } from '../repositories/IStudyRepository.js'
import { StudyWeekEntity } from '../entities/StudyWeek.js'

export class UpdateStudyProgressUseCase {
  constructor(private studyRepository: IStudyRepository) {}

  // タスクを完了させる
  async completeTask(weekNumber: number, dayIndex: number): Promise<StudyWeekEntity> {
    const week = await this.studyRepository.findWeekByNumber(weekNumber)
    if (!week) {
      throw new Error(`第${weekNumber}週の計画が見つかりません`)
    }

    if (dayIndex < 0 || dayIndex >= week.days.length) {
      throw new Error('無効な日のインデックスです')
    }

    // ドメインロジックを使用してタスク完了
    const updatedWeek = week.completeTask(dayIndex)
    
    return await this.studyRepository.updateWeek(updatedWeek)
  }

  // 学習時間を更新
  async updateStudyTime(
    weekNumber: number, 
    dayIndex: number, 
    actualTime: number
  ): Promise<void> {
    if (actualTime < 0) {
      throw new Error('学習時間は0以上で入力してください')
    }

    const week = await this.studyRepository.findWeekByNumber(weekNumber)
    if (!week) {
      throw new Error(`第${weekNumber}週の計画が見つかりません`)
    }

    if (dayIndex < 0 || dayIndex >= week.days.length) {
      throw new Error('無効な日のインデックスです')
    }

    await this.studyRepository.updateDayProgress(week.id!, dayIndex, {
      actualTime
    })
  }

  // 理解度を更新
  async updateUnderstanding(
    weekNumber: number,
    dayIndex: number,
    understanding: number
  ): Promise<StudyWeekEntity> {
    const week = await this.studyRepository.findWeekByNumber(weekNumber)
    if (!week) {
      throw new Error(`第${weekNumber}週の計画が見つかりません`)
    }

    if (dayIndex < 0 || dayIndex >= week.days.length) {
      throw new Error('無効な日のインデックスです')
    }

    // ドメインロジックを使用して理解度更新（バリデーション含む）
    const updatedWeek = week.updateUnderstanding(dayIndex, understanding)
    
    return await this.studyRepository.updateWeek(updatedWeek)
  }

  // メモを更新
  async updateMemo(
    weekNumber: number,
    dayIndex: number,
    memo: string
  ): Promise<void> {
    const week = await this.studyRepository.findWeekByNumber(weekNumber)
    if (!week) {
      throw new Error(`第${weekNumber}週の計画が見つかりません`)
    }

    if (dayIndex < 0 || dayIndex >= week.days.length) {
      throw new Error('無効な日のインデックスです')
    }

    await this.studyRepository.updateDayProgress(week.id!, dayIndex, {
      memo
    })
  }
}