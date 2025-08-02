// 学習記録エンティティ

export interface StudyLogData {
  id?: number
  date: Date
  subject: string
  topics: string[]
  studyTime: number  // 分
  understanding: number  // 1-5
  memo?: string
}

export class StudyLogEntity {
  constructor(private data: StudyLogData) {
    this.validateStudyTime()
    this.validateUnderstanding()
    this.validateFutureDate()
  }
  
  get id(): number | undefined {
    return this.data.id
  }
  
  get date(): Date {
    return this.data.date
  }
  
  get subject(): string {
    return this.data.subject
  }
  
  get topics(): string[] {
    return this.data.topics
  }
  
  get studyTime(): number {
    return this.data.studyTime
  }
  
  get understanding(): number {
    return this.data.understanding
  }
  
  get memo(): string {
    return this.data.memo || ''
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
  
  private validateFutureDate(): void {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 今日の終わりまで許可
    if (this.date > today) {
      throw new Error('未来の日付は入力できません')
    }
  }

  // ビジネスロジック: 学習効率を計算（分あたりの理解度）
  calculateEfficiency(): number {
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