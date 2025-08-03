// Prismaを使ったStudyLogリポジトリ実装

import { PrismaClient } from '@prisma/client'
import { IStudyLogRepository } from 'src/domain/repositories/IStudyLogRepository.js'
import { StudyLogEntity, StudyLogData } from 'src/domain/entities/StudyLog.js'

export class StudyLogRepository implements IStudyLogRepository {
  constructor(private prisma: PrismaClient) {}

  async create(studyLogData: Omit<StudyLogData, 'id'>): Promise<StudyLogEntity> {
    const created = await this.prisma.studyLog.create({
      data: {
        date: studyLogData.date,
        subject: studyLogData.subject,
        topics: JSON.stringify(studyLogData.topics),
        studyTime: studyLogData.studyTime,
        understanding: studyLogData.understanding,
        memo: studyLogData.memo
      }
    })

    return this.toDomainEntity(created)
  }

  async findById(id: number): Promise<StudyLogEntity | null> {
    const studyLog = await this.prisma.studyLog.findUnique({
      where: { id: id }
    })

    return studyLog ? this.toDomainEntity(studyLog) : null
  }

  async findAll(): Promise<StudyLogEntity[]> {
    const studyLogs = await this.prisma.studyLog.findMany({
      orderBy: { date: 'desc' }
    })

    return studyLogs.map(log => this.toDomainEntity(log))
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<StudyLogEntity[]> {
    const studyLogs = await this.prisma.studyLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'desc' }
    })

    return studyLogs.map(log => this.toDomainEntity(log))
  }

  async findBySubject(subject: string): Promise<StudyLogEntity[]> {
    const studyLogs = await this.prisma.studyLog.findMany({
      where: { subject },
      orderBy: { date: 'desc' }
    })

    return studyLogs.map(log => this.toDomainEntity(log))
  }

  async getTotalStudyTime(): Promise<number> {
    const result = await this.prisma.studyLog.aggregate({
      _sum: {
        studyTime: true
      }
    })

    return result._sum?.studyTime || 0
  }

  async getAverageUnderstanding(): Promise<number> {
    const result = await this.prisma.studyLog.aggregate({
      _avg: {
        understanding: true
      }
    })

    return result._avg?.understanding || 0
  }

  async getStudyStats(): Promise<{
    totalLogs: number
    totalTime: number
    averageUnderstanding: number
    mostStudiedSubject: string
  }> {
    // 基本統計
    const basicStats = await this.prisma.studyLog.aggregate({
      _count: {
        id: true
      },
      _sum: {
        studyTime: true
      },
      _avg: {
        understanding: true
      }
    })

    // 最も学習時間の多い科目を取得
    const subjectStats = await this.prisma.studyLog.groupBy({
      by: ['subject'],
      _sum: {
        studyTime: true
      },
      orderBy: {
        _sum: {
          studyTime: 'desc'
        }
      },
      take: 1
    })

    return {
      totalLogs: basicStats._count?.id || 0,
      totalTime: basicStats._sum?.studyTime || 0,
      averageUnderstanding: basicStats._avg?.understanding || 0,
      mostStudiedSubject: subjectStats[0]?.subject || 'なし'
    }
  }

  async deleteById(id: number): Promise<void> {
    await this.prisma.studyLog.delete({
      where: { id }
    })
  }

  // Prismaデータをドメインエンティティに変換
  private toDomainEntity(data: any): StudyLogEntity {
    return new StudyLogEntity({
      id: data.id,
      date: data.date,
      subject: data.subject,
      topics: JSON.parse(data.topics),
      studyTime: data.studyTime,
      understanding: data.understanding,
      memo: data.memo
    })
  }
}