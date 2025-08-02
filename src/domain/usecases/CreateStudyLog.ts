// ユースケース: 学習記録作成

import { IStudyLogRepository } from "../repositories/IStudyLogRepository.js";
import { StudyLogEntity, StudyLogData } from "../entities/StudyLog.js";

export interface CreateStudyLogRequest {
  date: Date;
  subject: string;
  topics: string[];
  studyTime: number;
  understanding: number;
  memo?: string;
}

export class CreateStudyLogUseCase {
  constructor(private studyLogRepository: IStudyLogRepository) {}

  async execute(
    request: CreateStudyLogRequest | StudyLogData
  ): Promise<StudyLogEntity> {
    // リクエスト形式を統一
    const studyLogData: StudyLogData =
      "id" in request
        ? request
        : {
            date: request.date,
            subject: request.subject,
            topics: request.topics,
            studyTime: request.studyTime,
            understanding: request.understanding,
            memo: request.memo,
          };

    // ビジネスルールの検証
    await this.validateRequest(studyLogData);

    // エンティティ作成（ドメインロジックとバリデーション）
    const studyLogEntity = new StudyLogEntity(studyLogData);

    // データベースに保存
    return await this.studyLogRepository.create({
      date: studyLogEntity.date,
      subject: studyLogEntity.subject,
      topics: studyLogEntity.topics,
      studyTime: studyLogEntity.studyTime,
      understanding: studyLogEntity.understanding,
      memo: studyLogEntity.memo,
    });
  }

  private async validateRequest(
    request: CreateStudyLogRequest | StudyLogData
  ): Promise<void> {
    // 未来の日付チェック
    if (request.date > new Date()) {
      throw new Error("未来の日付は記録できません");
    }

    // 科目名チェック
    if (!request.subject.trim()) {
      throw new Error("科目名は必須です");
    }

    // 更新の場合はIDがある場合重複チェックをスキップ
    if ("id" in request && request.id) {
      return;
    }

    // 同じ日の同じ科目の重複チェック
    const existingLogs = await this.studyLogRepository.findByDateRange(
      new Date(
        request.date.getFullYear(),
        request.date.getMonth(),
        request.date.getDate()
      ),
      new Date(
        request.date.getFullYear(),
        request.date.getMonth(),
        request.date.getDate() + 1
      )
    );

    const duplicateLog = existingLogs.find(
      (log) =>
        log.subject === request.subject &&
        log.date.toDateString() === request.date.toDateString()
    );

    if (duplicateLog) {
      throw new Error(
        `${request.date.toDateString()}の${
          request.subject
        }は既に記録されています`
      );
    }
  }
}
