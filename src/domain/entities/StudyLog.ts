// 学習記録エンティティ

export interface StudyLogData {
  id?: number
  date: Date
  subject: string
  studyTime: number  // 分
  understanding: number  // 1-5
  memo?: string
}

export class StudyLogEntity {
  constructor(
    public readonly id: number | undefined,
    public readonly date: Date,
    public readonly subject: string,
    public readonly studyTime: number,
    public readonly understanding: number,
    public readonly memo?: string
  ) {
    this.validateStudyTime()
    this.validateUnderstanding()
  }

  private validateStudyTime(): void {
    if (this.studyTime <= 0) {
      throw new Error('学習時間は0より大きい値を設定してください')
    }
  }

  private validateUnderstanding(): void {
    if (this.understanding < 1 || this.understanding > 5) {
      throw new Error('理解度は1から5の間で設定してください')
    }
  }

  // ビジネスロジック: 学習効率を計算（分あたりの理解度）
  getStudyEfficiency(): number {
    return this.understanding / this.studyTime * 60 // 時間あたりの理解度
  }

  // ビジネスロジック: 長時間学習かどうか判定
  isLongStudySession(): boolean {
    return this.studyTime >= 120 // 2時間以上
  }

  // ビジネスロジック: 高理解度かどうか判定
  isHighUnderstanding(): boolean {
    return this.understanding >= 4
  }
}