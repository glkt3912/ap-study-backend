import { PrismaClient } from '@prisma/client';
import { IStudyPlanRepository } from '../../../domain/repositories/IStudyPlanRepository.js';
import { StudyPlan, CreateStudyPlanRequest, UpdateStudyPlanRequest } from '../../../domain/entities/StudyPlan.js';

export class StudyPlanRepository implements IStudyPlanRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: number): Promise<StudyPlan | null> {
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
      targetExamDate: studyPlan.targetExamDate || undefined,
      templateId: studyPlan.templateId || undefined,
      templateName: studyPlan.templateName || undefined,
      studyWeeksData: studyPlan.studyWeeksData || undefined,
      settings: studyPlan.settings as any || {},
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

  async findById(id: number): Promise<StudyPlan | null> {
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
      targetExamDate: studyPlan.targetExamDate || undefined,
      templateId: studyPlan.templateId || undefined,
      templateName: studyPlan.templateName || undefined,
      studyWeeksData: studyPlan.studyWeeksData || undefined,
      settings: studyPlan.settings as any || {},
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

  async findActiveByUserId(userId: number): Promise<StudyPlan | null> {
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
      targetExamDate: studyPlan.targetExamDate || undefined,
      templateId: studyPlan.templateId || undefined,
      templateName: studyPlan.templateName || undefined,
      studyWeeksData: studyPlan.studyWeeksData || undefined,
      settings: studyPlan.settings as any || {},
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

  async create(userId: number, data: CreateStudyPlanRequest): Promise<StudyPlan> {
    console.log(`[StudyPlanRepository.create] Creating/updating plan for user ${userId}`);
    console.log(`[StudyPlanRepository.create] Received data:`, JSON.stringify(data, null, 2));
    
    // 既存の学習計画をチェック
    const existingPlan = await this.prisma.studyPlan.findUnique({
      where: { userId }
    });
    
    console.log(`[StudyPlanRepository.create] Existing plan found:`, existingPlan ? `ID ${existingPlan.id}` : 'None');

    let studyPlan;
    if (existingPlan) {
      // 既存の計画がある場合は更新（置き換え）
      // まず関連する週とタスクを削除
      await this.prisma.studyDay.deleteMany({
        where: {
          week: {
            studyPlanId: existingPlan.id
          }
        }
      });
      await this.prisma.studyWeek.deleteMany({
        where: { studyPlanId: existingPlan.id }
      });

      // 学習計画を更新
      studyPlan = await this.prisma.studyPlan.update({
        where: { userId },
        data: {
          name: data.name,
          description: data.description,
          templateId: data.templateId,
          templateName: data.templateName,
          studyWeeksData: data.studyWeeksData as any,
          targetExamDate: data.targetExamDate,
          startDate: data.startDate || new Date(),
          settings: data.settings as any || {},
          isActive: true,
          updatedAt: new Date()
        },
        include: {
          weeks: {
            include: {
              days: true
            }
          }
        }
      });
    } else {
      // 新規作成
      studyPlan = await this.prisma.studyPlan.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          templateId: data.templateId,
          templateName: data.templateName,
          studyWeeksData: data.studyWeeksData as any,
          targetExamDate: data.targetExamDate,
          startDate: data.startDate || new Date(),
          settings: data.settings as any || {}
        },
        include: {
          weeks: {
            include: {
              days: true
            }
          }
        }
      });
    }

    // studyWeeksDataが提供されている場合、実際のStudyWeekとStudyDayレコードを作成
    console.log(`[StudyPlanRepository.create] Checking studyWeeksData:`, data.studyWeeksData ? 'present' : 'missing', Array.isArray(data.studyWeeksData) ? 'is array' : 'not array');
    if (data.studyWeeksData && Array.isArray(data.studyWeeksData)) {
      console.log(`[StudyPlanRepository.create] Creating ${data.studyWeeksData.length} weeks from template data`);
      
      for (const weekData of data.studyWeeksData) {
        const createdWeek = await this.prisma.studyWeek.create({
          data: {
            studyPlanId: studyPlan.id,
            weekNumber: weekData.weekNumber,
            title: weekData.title,
            phase: weekData.phase,
            goals: weekData.goals
          }
        });

        // 各週の日データを作成
        if (weekData.days && Array.isArray(weekData.days)) {
          for (const dayData of weekData.days) {
            await this.prisma.studyDay.create({
              data: {
                weekId: createdWeek.id,
                day: dayData.day,
                subject: dayData.subject,
                topics: dayData.topics,
                estimatedTime: dayData.estimatedTime,
                actualTime: dayData.actualTime || 0,
                completed: dayData.completed || false,
                understanding: dayData.understanding || 0,
                memo: dayData.memo || null
              }
            });
          }
        }
      }

      // 作成後の完全なデータを再取得
      studyPlan = await this.prisma.studyPlan.findUnique({
        where: { id: studyPlan.id },
        include: {
          weeks: {
            include: {
              days: true
            },
            orderBy: { weekNumber: 'asc' }
          }
        }
      }) || studyPlan;
    } else {
      // studyWeeksDataがない場合、従来の固定テンプレートを使用
      console.log(`[StudyPlanRepository.create] No studyWeeksData provided, using default template`);
      await this.createDefaultWeeks(studyPlan.id, 8);
      
      // 作成後の完全なデータを再取得
      studyPlan = await this.prisma.studyPlan.findUnique({
        where: { id: studyPlan.id },
        include: {
          weeks: {
            include: {
              days: true
            },
            orderBy: { weekNumber: 'asc' }
          }
        }
      }) || studyPlan;
    }

    return {
      ...studyPlan,
      description: studyPlan.description || undefined,
      targetExamDate: studyPlan.targetExamDate || undefined,
      templateId: studyPlan.templateId || undefined,
      templateName: studyPlan.templateName || undefined,
      studyWeeksData: studyPlan.studyWeeksData || undefined,
      settings: studyPlan.settings as any || {},
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

  async update(id: number, data: UpdateStudyPlanRequest): Promise<StudyPlan> {
    const studyPlan = await this.prisma.studyPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        templateId: data.templateId,
        templateName: data.templateName,
        targetExamDate: data.targetExamDate,
        isActive: data.isActive,
        settings: data.settings as any
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
      targetExamDate: studyPlan.targetExamDate || undefined,
      templateId: studyPlan.templateId || undefined,
      templateName: studyPlan.templateName || undefined,
      studyWeeksData: studyPlan.studyWeeksData || undefined,
      settings: studyPlan.settings as any || {},
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

  async activate(id: number): Promise<StudyPlan> {
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
      targetExamDate: updatedPlan.targetExamDate || undefined,
      templateId: updatedPlan.templateId || undefined,
      templateName: updatedPlan.templateName || undefined,
      settings: updatedPlan.settings as any || {},
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

  async deactivate(id: number): Promise<StudyPlan> {
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
      targetExamDate: studyPlan.targetExamDate || undefined,
      templateId: studyPlan.templateId || undefined,
      templateName: studyPlan.templateName || undefined,
      studyWeeksData: studyPlan.studyWeeksData || undefined,
      settings: studyPlan.settings as any || {},
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
      templateId: 'ap-standard-12week',
      templateName: 'AP試験対策 標準コース',
      settings: {
        timeSettings: {
          totalWeeks: 12,
          weeklyHours: 25,
          dailyHours: 3
        },
        planType: {
          isCustom: false,
          source: 'template_based'
        },
        preferences: {
          focusAreas: ['基礎理論', 'アルゴリズム', 'データベース', 'ネットワーク'],
          studyStyle: 'balanced',
          difficultyLevel: 'intermediate',
          reviewFrequency: 3,
          breakDuration: 15,
          notificationEnabled: true
        },
        metadata: {}
      }
    };
  }

  async createFromTemplate(
    userId: number, 
    _templateName: string, 
    customizations?: Partial<CreateStudyPlanRequest>
  ): Promise<StudyPlan> {
    const template = await this.getDefaultTemplate();
    
    const data = {
      ...template,
      ...customizations,
      settings: {
        ...template.settings,
        ...(customizations?.settings || {})
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

    const actualWeeksCount = studyPlan.weeks.length;
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
    const settings = studyPlan.settings as any || {};
    const plannedTotalWeeks = settings.timeSettings?.totalWeeks || 12;
    const endDate = studyPlan.targetExamDate || 
      new Date(studyPlan.startDate.getTime() + (plannedTotalWeeks * 7 * 24 * 60 * 60 * 1000));
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      totalWeeks: plannedTotalWeeks,
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
    const settings = studyPlan.settings as any || {};
    const weeksToGenerate = settings.timeSettings?.totalWeeks || 12;
    const weekTemplates = this.getWeekTemplates(weeksToGenerate);

    for (let i = 0; i < weeksToGenerate; i++) {
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
            estimatedTime: Math.round((settings.timeSettings?.dailyHours || 3) * 60), // Convert hours to minutes
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

  private async createDefaultWeeks(studyPlanId: number, totalWeeks: number): Promise<void> {
    const weekTemplates = this.getWeekTemplates(totalWeeks);

    for (let i = 0; i < totalWeeks; i++) {
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
            estimatedTime: 360, // Default 6 hours in minutes
            actualTime: 0,
            completed: false,
            understanding: 0
          }
        });
      }
    }
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