// ユースケース: 学習記録作成

import { IStudyLogRepository } from '../repositories/IStudyLogRepository.js'
import { StudyLogEntity, StudyLogData } from '../entities/StudyLog.js'

export interface CreateStudyLogRequest {
  date: Date
  subject: string
  studyTime: number
  understanding: number
  memo?: string
}

export class CreateStudyLogUseCase {
  constructor(private studyLogRepository: IStudyLogRepository) {}

  async execute(request: CreateStudyLogRequest): Promise<StudyLogEntity> {
    // ビジネスルールの検証
    await this.validateRequest(request)
    
    // エンティティ作成（ドメインロジックとバリデーション）
    const studyLogEntity = new StudyLogEntity(
      undefined,
      request.date,
      request.subject,
      request.studyTime,
      request.understanding,
      request.memo
    )

    // データベースに保存
    return await this.studyLogRepository.create({
      date: studyLogEntity.date,
      subject: studyLogEntity.subject,
      studyTime: studyLogEntity.studyTime,
      understanding: studyLogEntity.understanding,
      memo: studyLogEntity.memo
    })
  }

  private async validateRequest(request: CreateStudyLogRequest): Promise<void> {
    // 未来の日付チェック
    if (request.date > new Date()) {
      throw new Error('未来の日付は記録できません')
    }

    // 科目名チェック
    if (!request.subject.trim()) {
      throw new Error('科目名は必須です')
    }

    // 同じ日の同じ科目の重複チェック
    const existingLogs = await this.studyLogRepository.findByDateRange(
      new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate()),
      new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate() + 1)
    )

    const duplicateLog = existingLogs.find(log => 
      log.subject === request.subject &&
      log.date.toDateString() === request.date.toDateString()
    )

    if (duplicateLog) {
      throw new Error(`${request.date.toDateString()}の${request.subject}は既に記録されています`)
    }
  }
}