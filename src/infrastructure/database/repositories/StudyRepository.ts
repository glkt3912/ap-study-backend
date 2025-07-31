// Prismaを使ったリポジトリ実装

import { PrismaClient } from '@prisma/client'
import { IStudyRepository } from '../../../domain/repositories/IStudyRepository.js'
import { StudyWeekEntity, StudyWeek } from '../../../domain/entities/StudyWeek.js'

export class StudyRepository implements IStudyRepository {
  constructor(private prisma: PrismaClient) {}

  async findAllWeeks(): Promise<StudyWeekEntity[]> {
    const weeks = await this.prisma.studyWeek.findMany({
      include: {
        days: {
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { weekNumber: 'asc' }
    })

    return weeks.map(week => this.toDomainEntity(week))
  }

  async findWeekByNumber(weekNumber: number): Promise<StudyWeekEntity | null> {
    const week = await this.prisma.studyWeek.findUnique({
      where: { weekNumber },
      include: {
        days: {
          orderBy: { id: 'asc' }
        }
      }
    })

    return week ? this.toDomainEntity(week) : null
  }

  async updateWeek(week: StudyWeekEntity): Promise<StudyWeekEntity> {
    if (!week.id) {
      throw new Error('週のIDが必要です')
    }

    // トランザクション内で週と日を更新
    const updatedWeek = await this.prisma.$transaction(async (tx) => {
      // 週の情報を更新
      await tx.studyWeek.update({
        where: { id: week.id },
        data: {
          title: week.title,
          phase: week.phase,
          goals: JSON.stringify(week.goals)
        }
      })

      // 各日の情報を更新
      for (let i = 0; i < week.days.length; i++) {
        const day = week.days[i]
        await tx.studyDay.updateMany({
          where: {
            weekId: week.id,
            day: day.day
          },
          data: {
            subject: day.subject,
            topics: JSON.stringify(day.topics),
            estimatedTime: day.estimatedTime,
            actualTime: day.actualTime,
            completed: day.completed,
            understanding: day.understanding,
            memo: day.memo
          }
        })
      }

      // 更新後のデータを取得
      return await tx.studyWeek.findUnique({
        where: { id: week.id },
        include: {
          days: {
            orderBy: { id: 'asc' }
          }
        }
      })
    })

    if (!updatedWeek) {
      throw new Error('週の更新に失敗しました')
    }

    return this.toDomainEntity(updatedWeek)
  }

  async updateDayProgress(
    weekId: number,
    dayIndex: number,
    updates: Partial<StudyWeek['days'][0]>
  ): Promise<void> {
    // 週の日データを取得
    const week = await this.prisma.studyWeek.findUnique({
      where: { id: weekId },
      include: { days: { orderBy: { id: 'asc' } } }
    })

    if (!week || dayIndex >= week.days.length) {
      throw new Error('無効な週または日のインデックスです')
    }

    const dayId = week.days[dayIndex].id

    await this.prisma.studyDay.update({
      where: { id: dayId },
      data: {
        ...(updates.actualTime !== undefined && { actualTime: updates.actualTime }),
        ...(updates.completed !== undefined && { completed: updates.completed }),
        ...(updates.understanding !== undefined && { understanding: updates.understanding }),
        ...(updates.memo !== undefined && { memo: updates.memo })
      }
    })
  }

  async createWeek(weekData: Omit<StudyWeek, 'id'>): Promise<StudyWeekEntity> {
    const created = await this.prisma.studyWeek.create({
      data: {
        weekNumber: weekData.weekNumber,
        title: weekData.title,
        phase: weekData.phase,
        goals: JSON.stringify(weekData.goals),
        days: {
          create: weekData.days.map(day => ({
            day: day.day,
            subject: day.subject,
            topics: JSON.stringify(day.topics),
            estimatedTime: day.estimatedTime,
            actualTime: day.actualTime,
            completed: day.completed,
            understanding: day.understanding,
            memo: day.memo
          }))
        }
      },
      include: {
        days: {
          orderBy: { id: 'asc' }
        }
      }
    })

    return this.toDomainEntity(created)
  }

  async initializeDefaultPlan(): Promise<void> {
    // 初期データ（フロントエンドのstudyPlanDataから移植）
    const defaultWeeks = [
      {
        weekNumber: 1,
        title: "基礎固め期",
        phase: "基礎固め期",
        goals: ["基本的な概念理解"],
        days: [
          {
            day: "月",
            subject: "コンピュータの基礎理論",
            topics: ["2進数", "論理演算"],
            estimatedTime: 180,
            actualTime: 0,
            completed: false,
            understanding: 0,
          },
          {
            day: "火",
            subject: "アルゴリズムとデータ構造",
            topics: ["ソート", "探索", "計算量"],
            estimatedTime: 180,
            actualTime: 0,
            completed: false,
            understanding: 0,
          },
          {
            day: "水",
            subject: "ハードウェア基礎",
            topics: ["CPU", "メモリ", "入出力装置"],
            estimatedTime: 180,
            actualTime: 0,
            completed: false,
            understanding: 0,
          },
          {
            day: "木",
            subject: "ソフトウェア基礎",
            topics: ["OS", "ミドルウェア", "ファイルシステム"],
            estimatedTime: 180,
            actualTime: 0,
            completed: false,
            understanding: 0,
          },
          {
            day: "金",
            subject: "午前問題演習",
            topics: ["1-20問", "基礎理論分野"],
            estimatedTime: 120,
            actualTime: 0,
            completed: false,
            understanding: 0,
          },
        ],
      },
      // 他の週も同様に...（省略）
    ]

    // バッチ作成
    for (const week of defaultWeeks) {
      await this.createWeek(week)
    }
  }

  async getTotalProgress(): Promise<{
    totalDays: number
    completedDays: number
    totalStudyTime: number
    averageUnderstanding: number
  }> {
    const result = await this.prisma.studyDay.aggregate({
      _count: {
        id: true,
        completed: { equals: true }
      },
      _sum: {
        actualTime: true
      },
      _avg: {
        understanding: true
      }
    })

    return {
      totalDays: result._count.id || 0,
      completedDays: result._count.completed || 0,
      totalStudyTime: result._sum.actualTime || 0,
      averageUnderstanding: result._avg.understanding || 0
    }
  }

  // Prismaデータをドメインエンティティに変換
  private toDomainEntity(data: any): StudyWeekEntity {
    return new StudyWeekEntity(
      data.id,
      data.weekNumber,
      data.title,
      data.phase,
      JSON.parse(data.goals),
      data.days.map((day: any) => ({
        id: day.id,
        day: day.day,
        subject: day.subject,
        topics: JSON.parse(day.topics),
        estimatedTime: day.estimatedTime,
        actualTime: day.actualTime,
        completed: day.completed,
        understanding: day.understanding,
        memo: day.memo
      }))
    )
  }
}