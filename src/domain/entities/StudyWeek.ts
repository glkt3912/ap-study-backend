// ドメインエンティティ - ビジネスロジックの中核

export interface StudyDay {
  id?: number;
  day: string;
  subject: string;
  topics: string[];
  estimatedTime: number;
  actualTime: number;
  completed: boolean;
  understanding: number; // 1-5
  memo?: string;
}

export interface StudyWeek {
  id?: number;
  weekNumber: number;
  title: string;
  phase: string;
  goals: string[];
  days: StudyDay[];
}

export class StudyWeekEntity {
  constructor(
    public readonly id: number | undefined,
    public readonly weekNumber: number,
    public readonly title: string,
    public readonly phase: string,
    public readonly goals: string[],
    public readonly days: StudyDay[]
  ) {}

  // ビジネスロジック: 週の進捗率を計算
  getProgressPercentage(): number {
    const completedDays = this.days.filter((day) => day.completed).length;
    return (completedDays / this.days.length) * 100;
  }

  // ビジネスロジック: 週の総学習時間を計算
  getTotalStudyTime(): number {
    return this.days.reduce((total, day) => total + day.actualTime, 0);
  }

  // ビジネスロジック: 週の平均理解度を計算
  getAverageUnderstanding(): number {
    const totalUnderstanding = this.days.reduce(
      (total, day) => total + day.understanding,
      0
    );
    return totalUnderstanding / this.days.length;
  }

  // ビジネスロジック: タスクを完了させる
  completeTask(dayIndex: number): StudyWeekEntity {
    const updatedDays = this.days.map((day, index) => {
      if (index === dayIndex) {
        return {
          ...day,
          completed: true,
          actualTime: day.actualTime || day.estimatedTime, // 実際時間が0なら予定時間をセット
        };
      }
      return day;
    });

    return new StudyWeekEntity(
      this.id,
      this.weekNumber,
      this.title,
      this.phase,
      this.goals,
      updatedDays
    );
  }

  // ビジネスロジック: 理解度を更新
  updateUnderstanding(
    dayIndex: number,
    understanding: number
  ): StudyWeekEntity {
    if (understanding < 1 || understanding > 5) {
      throw new Error("理解度は1から5の間で設定してください");
    }

    const updatedDays = this.days.map((day, index) => {
      if (index === dayIndex) {
        return { ...day, understanding };
      }
      return day;
    });

    return new StudyWeekEntity(
      this.id,
      this.weekNumber,
      this.title,
      this.phase,
      this.goals,
      updatedDays
    );
  }
}
