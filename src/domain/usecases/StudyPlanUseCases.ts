import { IStudyPlanRepository } from '../repositories/IStudyPlanRepository.js';
import { IStudyRepository } from '../repositories/IStudyRepository.js';
import { StudyPlanEntity, CreateStudyPlanRequest, UpdateStudyPlanRequest, StudyPlanPreferences } from '../entities/StudyPlan.js';

export class StudyPlanUseCases {
  constructor(
    private studyPlanRepository: IStudyPlanRepository,
    private studyRepository: IStudyRepository
  ) {}

  async getUserStudyPlan(userId: number): Promise<StudyPlanEntity | null> {
    const studyPlan = await this.studyPlanRepository.findByUserId(userId);
    
    if (!studyPlan) {
      return null;
    }

    return studyPlan;
  }

  async createStudyPlan(userId: number, data: CreateStudyPlanRequest): Promise<StudyPlanEntity> {
    // 学習計画を作成または更新（リポジトリレイヤーで既存計画をチェック）
    const studyPlan = await this.studyPlanRepository.create(userId, {
      name: data.name,
      description: data.description,
      templateId: data.templateId,
      templateName: data.templateName,
      studyWeeksData: data.studyWeeksData, // studyWeeksDataを渡す
      targetExamDate: data.targetExamDate,
      startDate: data.startDate || new Date(),
      settings: data.settings || {
        timeSettings: {
          totalWeeks: 12,
          weeklyHours: 25,
          dailyHours: 3
        },
        planType: {
          isCustom: true,
          source: 'user_created'
        },
        preferences: {},
        metadata: {}
      }
    });

    // studyWeeksDataが提供されていない場合のみ、デフォルトの学習週を生成
    if (!data.studyWeeksData || !Array.isArray(data.studyWeeksData) || data.studyWeeksData.length === 0) {
      await this.studyPlanRepository.generateWeeks(studyPlan.id);
    }

    return studyPlan;
  }

  async updateStudyPlan(studyPlanId: number, data: UpdateStudyPlanRequest): Promise<StudyPlanEntity> {
    const studyPlan = await this.studyPlanRepository.update(studyPlanId, data);
    
    // 学習期間が変更された場合は週数を再生成
    if (data.settings?.timeSettings?.totalWeeks) {
      await this.studyPlanRepository.generateWeeks(studyPlan.id);
    }

    return studyPlan;
  }

  async deleteStudyPlan(studyPlanId: number): Promise<void> {
    await this.studyPlanRepository.delete(studyPlanId);
  }

  async createFromTemplate(userId: number, templateName: string = 'default', customizations?: Partial<CreateStudyPlanRequest>): Promise<StudyPlanEntity> {
    // 既存のアクティブプランを無効化
    const existingPlan = await this.studyPlanRepository.findActiveByUserId(userId);
    if (existingPlan) {
      await this.studyPlanRepository.deactivate(existingPlan.id);
    }

    const studyPlan = await this.studyPlanRepository.createFromTemplate(userId, templateName, customizations);
    
    // 学習週を生成
    await this.studyPlanRepository.generateWeeks(studyPlan.id);

    return studyPlan;
  }

  async getStudyPlanProgress(studyPlanId: number) {
    const progress = await this.studyPlanRepository.getProgress(studyPlanId);
    
    return {
      ...progress,
      progressPercentage: Math.round((progress.completedWeeks / progress.totalWeeks) * 100),
      studyHoursPercentage: Math.round((progress.actualStudyHours / progress.totalStudyHours) * 100),
      isOnTrack: progress.actualStudyHours >= progress.totalStudyHours * 0.8 // 80%以上で順調
    };
  }

  async adjustStudyPlan(studyPlanId: number, preferences: Partial<StudyPlanPreferences>): Promise<StudyPlanEntity> {
    const studyPlan = await this.studyPlanRepository.findById(studyPlanId);
    if (!studyPlan) {
      throw new Error('Study plan not found');
    }

    const currentSettings = studyPlan.settings || {};
    const updatedPreferences = {
      ...currentSettings.preferences,
      ...preferences
    };

    const updatedSettings = {
      ...currentSettings,
      preferences: updatedPreferences
    };

    return await this.studyPlanRepository.update(studyPlanId, {
      settings: updatedSettings
    });
  }

  async generateRecommendations(userId: number): Promise<{
    recommendedDailyHours: number;
    recommendedWeeklyHours: number;
    focusAreas: string[];
    studyTips: string[];
  }> {
    const studyData = await this.fetchStudyData(userId)
    
    if (!studyData.studyPlan || !studyData.progress) {
      return this.getDefaultRecommendations()
    }

    const progressAnalysis = this.analyzeProgress(studyData.progress)
    const timeRecommendations = this.calculateTimeRecommendations(studyData, progressAnalysis)
    
    return {
      ...timeRecommendations,
      focusAreas: this.getFocusAreas(studyData.progress.averageUnderstanding),
      studyTips: this.getStudyTips(progressAnalysis.isAhead, progressAnalysis.isBehind, studyData.progress.remainingDays)
    }
  }

  private async fetchStudyData(userId: number) {
    const studyPlan = await this.studyPlanRepository.findActiveByUserId(userId)
    const progress = studyPlan ? await this.studyPlanRepository.getProgress(studyPlan.id) : null
    return { studyPlan, progress }
  }

  private getDefaultRecommendations() {
    return {
      recommendedDailyHours: 3,
      recommendedWeeklyHours: 25,
      focusAreas: ['基礎理論', 'アルゴリズム', 'データベース'],
      studyTips: ['毎日一定の時間を確保しましょう', '苦手分野を重点的に学習しましょう']
    }
  }

  private analyzeProgress(progress: any) {
    const isAhead = progress.actualStudyHours > progress.totalStudyHours
    const isBehind = progress.actualStudyHours < progress.totalStudyHours * 0.7
    return { isAhead, isBehind }
  }

  private calculateTimeRecommendations(studyData: any, progressAnalysis: any) {
    let recommendedDailyHours = studyData.studyPlan.settings.timeSettings?.dailyHours || 3
    let recommendedWeeklyHours = studyData.studyPlan.settings.timeSettings?.weeklyHours || 21

    if (progressAnalysis.isBehind && studyData.progress.remainingDays > 0) {
      const catchUpHours = (studyData.progress.totalStudyHours - studyData.progress.actualStudyHours) / studyData.progress.remainingDays
      recommendedDailyHours = Math.ceil(catchUpHours * 1.2)
      recommendedWeeklyHours = recommendedDailyHours * 7
    }

    return { recommendedDailyHours, recommendedWeeklyHours }
  }

  private getFocusAreas(averageUnderstanding: number): string[] {
    if (averageUnderstanding < 3) {
      return ['基礎理論', 'コンピュータシステム', '基本情報処理'];
    } else if (averageUnderstanding < 4) {
      return ['アルゴリズム', 'データベース', 'ネットワーク'];
    } else {
      return ['システム開発', 'プロジェクトマネジメント', '情報セキュリティ'];
    }
  }

  private getStudyTips(isAhead: boolean, isBehind: boolean, remainingDays: number): string[] {
    const tips: string[] = [];

    if (isAhead) {
      tips.push('順調に進んでいます。復習に時間を割きましょう');
      tips.push('過去問演習で実践力を鍛えましょう');
    } else if (isBehind) {
      tips.push('学習ペースを上げる必要があります');
      if (remainingDays > 30) {
        tips.push('計画的に学習時間を増やしましょう');
      } else {
        tips.push('重要分野に集中して学習しましょう');
      }
    }

    tips.push('定期的な復習で記憶を定着させましょう');
    tips.push('苦手分野は早めに対策しましょう');

    return tips;
  }
}