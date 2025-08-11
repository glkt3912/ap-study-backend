import { PrismaClient } from '@prisma/client';
import { IStudyPlanRepository } from '../../../domain/repositories/IStudyPlanRepository.js';
import { StudyPlanEntity, CreateStudyPlanRequest, UpdateStudyPlanRequest } from '../../../domain/entities/StudyPlan.js';

export class StudyPlanRepository implements IStudyPlanRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: number): Promise<StudyPlanEntity | null> {
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { userId },
      include: {
        weeks: {
          include: {
            days: true
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    });

    if (!studyPlan) {
      return null;
    }

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      examDate: studyPlan.examDate || undefined,
      endDate: studyPlan.endDate || undefined,
      preferences: studyPlan.preferences as Record<string, any>,
      metadata: studyPlan.metadata as Record<string, any>,
      weeks: studyPlan.weeks ? studyPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async findById(id: number): Promise<StudyPlanEntity | null> {
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { id },
      include: {
        weeks: {
          include: {
            days: true
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    });

    if (!studyPlan) {
      return null;
    }

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      examDate: studyPlan.examDate || undefined,
      endDate: studyPlan.endDate || undefined,
      preferences: studyPlan.preferences as Record<string, any>,
      metadata: studyPlan.metadata as Record<string, any>,
      weeks: studyPlan.weeks ? studyPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async findActiveByUserId(userId: number): Promise<StudyPlanEntity | null> {
    const studyPlan = await this.prisma.studyPlan.findFirst({
      where: { 
        userId,
        isActive: true
      },
      include: {
        weeks: {
          include: {
            days: true
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    });

    if (!studyPlan) {
      return null;
    }

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      examDate: studyPlan.examDate || undefined,
      endDate: studyPlan.endDate || undefined,
      preferences: studyPlan.preferences as Record<string, any>,
      metadata: studyPlan.metadata as Record<string, any>,
      weeks: studyPlan.weeks ? studyPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async create(userId: number, data: CreateStudyPlanRequest): Promise<StudyPlanEntity> {
    const studyPlan = await this.prisma.studyPlan.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        totalWeeks: data.totalWeeks || 12,
        weeklyHours: data.weeklyHours || 25,
        dailyHours: data.dailyHours || 3,
        examDate: data.examDate,
        startDate: data.startDate || new Date(),
        isCustom: true,
        preferences: data.preferences || {},
        metadata: {}
      },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    });

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      examDate: studyPlan.examDate || undefined,
      endDate: studyPlan.endDate || undefined,
      preferences: studyPlan.preferences as Record<string, any>,
      metadata: studyPlan.metadata as Record<string, any>,
      weeks: studyPlan.weeks ? studyPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async update(id: number, data: UpdateStudyPlanRequest): Promise<StudyPlanEntity> {
    const studyPlan = await this.prisma.studyPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        totalWeeks: data.totalWeeks,
        weeklyHours: data.weeklyHours,
        dailyHours: data.dailyHours,
        examDate: data.examDate,
        endDate: data.endDate,
        isActive: data.isActive,
        preferences: data.preferences
      },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    });

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      examDate: studyPlan.examDate || undefined,
      endDate: studyPlan.endDate || undefined,
      preferences: studyPlan.preferences as Record<string, any>,
      metadata: studyPlan.metadata as Record<string, any>,
      weeks: studyPlan.weeks ? studyPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async delete(id: number): Promise<void> {
    await this.prisma.studyPlan.delete({
      where: { id }
    });
  }

  async activate(id: number): Promise<StudyPlanEntity> {
    // 同じユーザーの他のプランを無効化
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { id }
    });

    if (studyPlan) {
      await this.prisma.studyPlan.updateMany({
        where: { 
          userId: studyPlan.userId,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    const updatedPlan = await this.prisma.studyPlan.update({
      where: { id },
      data: { isActive: true },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    });

    return {
      ...updatedPlan,
      description: updatedPlan.description || undefined,
      examDate: updatedPlan.examDate || undefined,
      endDate: updatedPlan.endDate || undefined,
      preferences: updatedPlan.preferences as Record<string, any>,
      metadata: updatedPlan.metadata as Record<string, any>,
      weeks: updatedPlan.weeks ? updatedPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async deactivate(id: number): Promise<StudyPlanEntity> {
    const studyPlan = await this.prisma.studyPlan.update({
      where: { id },
      data: { isActive: false },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    });

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      examDate: studyPlan.examDate || undefined,
      endDate: studyPlan.endDate || undefined,
      preferences: studyPlan.preferences as Record<string, any>,
      metadata: studyPlan.metadata as Record<string, any>,
      weeks: studyPlan.weeks ? studyPlan.weeks.map((week: any) => ({
        ...week,
        goals: Array.isArray(week.goals) ? week.goals : JSON.parse(week.goals || '[]'),
        days: week.days?.map((day: any) => ({
          ...day,
          memo: day.memo || undefined,
          topics: Array.isArray(day.topics) ? day.topics : JSON.parse(day.topics || '[]')
        })) || []
      })) : []
    };
  }

  async getDefaultTemplate(): Promise<CreateStudyPlanRequest> {
    return {
      name: 'AP試験対策 標準学習計画',
      description: '応用情報技術者試験の合格を目指す12週間の学習計画です',
      totalWeeks: 12,
      weeklyHours: 25,
      dailyHours: 3,
      preferences: {
        focusAreas: ['基礎理論', 'アルゴリズム', 'データベース', 'ネットワーク'],
        studyStyle: 'balanced',
        difficultyLevel: 'intermediate',
        reviewFrequency: 3,
        breakDuration: 15,
        notificationEnabled: true
      }
    };
  }

  async createFromTemplate(
    userId: number, 
    _templateName: string, 
    customizations?: Partial<CreateStudyPlanRequest>
  ): Promise<StudyPlanEntity> {
    const template = await this.getDefaultTemplate();
    
    const data = {
      ...template,
      ...customizations,
      preferences: {
        ...template.preferences,
        ...(customizations?.preferences || {})
      }
    };

    return await this.create(userId, data);
  }

  async getProgress(studyPlanId: number): Promise<{
    totalWeeks: number;
    completedWeeks: number;
    totalStudyHours: number;
    actualStudyHours: number;
    averageUnderstanding: number;
    remainingDays: number;
  }> {
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { id: studyPlanId },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    });

    if (!studyPlan) {
      throw new Error('Study plan not found');
    }

    const totalWeeks = studyPlan.weeks.length;
    const completedWeeks = studyPlan.weeks.filter(week => 
      week.days.every(day => day.completed)
    ).length;

    const totalStudyHours = studyPlan.weeks.reduce((total, week) => 
      total + week.days.reduce((weekTotal, day) => weekTotal + day.estimatedTime, 0), 0
    ) / 60; // Convert minutes to hours

    const actualStudyHours = studyPlan.weeks.reduce((total, week) => 
      total + week.days.reduce((weekTotal, day) => weekTotal + day.actualTime, 0), 0
    ) / 60; // Convert minutes to hours

    const understandingScores = studyPlan.weeks.flatMap(week => 
      week.days.map(day => day.understanding)
    ).filter(score => score > 0);

    const averageUnderstanding = understandingScores.length > 0 
      ? understandingScores.reduce((sum, score) => sum + score, 0) / understandingScores.length
      : 0;

    const today = new Date();
    const endDate = studyPlan.examDate || 
      new Date(studyPlan.startDate.getTime() + (studyPlan.totalWeeks * 7 * 24 * 60 * 60 * 1000));
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      totalWeeks,
      completedWeeks,
      totalStudyHours,
      actualStudyHours,
      averageUnderstanding,
      remainingDays
    };
  }

  async generateWeeks(studyPlanId: number): Promise<void> {
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { id: studyPlanId }
    });

    if (!studyPlan) {
      throw new Error('Study plan not found');
    }

    // 既存の週を削除
    await this.prisma.studyWeek.deleteMany({
      where: { studyPlanId }
    });

    // 標準テンプレートに基づいて週を生成
    const weekTemplates = this.getWeekTemplates(studyPlan.totalWeeks);

    for (let i = 0; i < studyPlan.totalWeeks; i++) {
      const template = weekTemplates[i] || weekTemplates[weekTemplates.length - 1];
      
      const week = await this.prisma.studyWeek.create({
        data: {
          weekNumber: i + 1,
          title: template.title.replace('Week X', `Week ${i + 1}`),
          phase: template.phase,
          goals: template.goals,
          studyPlanId: studyPlanId
        }
      });

      // 日次計画を生成
      for (const dayTemplate of template.days) {
        await this.prisma.studyDay.create({
          data: {
            weekId: week.id,
            day: dayTemplate.day,
            subject: dayTemplate.subject,
            topics: dayTemplate.topics,
            estimatedTime: Math.round(studyPlan.dailyHours * 60), // Convert hours to minutes
            actualTime: 0,
            completed: false,
            understanding: 0
          }
        });
      }
    }
  }

  async updateWeekAssignments(studyPlanId: number, weekIds: number[]): Promise<void> {
    // Reset existing assignments
    await this.prisma.studyWeek.updateMany({
      where: { studyPlanId },
      data: { studyPlanId: null }
    });

    // Assign new weeks
    await this.prisma.studyWeek.updateMany({
      where: { 
        id: { in: weekIds }
      },
      data: { studyPlanId }
    });
  }

  private getWeekTemplates(totalWeeks: number) {
    // 基本的な12週間テンプレート
    const baseTemplates = [
      {
        title: 'Week X: 基礎固め期',
        phase: '基礎固め期',
        goals: ['基本的な概念理解', 'コンピュータ基礎の習得'],
        days: [
          { day: '月', subject: 'コンピュータの基礎理論', topics: ['2進数、8進数、16進数', '論理演算', '補数表現'] },
          { day: '火', subject: 'アルゴリズムとデータ構造', topics: ['ソート', '探索', '計算量'] },
          { day: '水', subject: 'ハードウェア基礎', topics: ['CPU', 'メモリ', '入出力装置'] },
          { day: '木', subject: 'ソフトウェア基礎', topics: ['OS', 'ミドルウェア', 'ファイルシステム'] },
          { day: '金', subject: '午前問題演習', topics: ['1-20問', '基礎理論分野'] }
        ]
      }
      // 他のテンプレートも追加可能
    ];

    // totalWeeksに応じてテンプレートを調整
    const templates = [];
    for (let i = 0; i < totalWeeks; i++) {
      const baseIndex = i % baseTemplates.length;
      templates.push(baseTemplates[baseIndex]);
    }

    return templates;
  }
}