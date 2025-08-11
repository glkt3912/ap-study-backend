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
    // 既存のアクティブプランを無効化
    const existingPlan = await this.studyPlanRepository.findActiveByUserId(userId);
    if (existingPlan) {
      await this.studyPlanRepository.deactivate(existingPlan.id);
    }

    // 新しい学習計画を作成
    const studyPlan = await this.studyPlanRepository.create(userId, {
      name: data.name,
      description: data.description,
      totalWeeks: data.totalWeeks || 12,
      weeklyHours: data.weeklyHours || 25,
      dailyHours: data.dailyHours || 3,
      examDate: data.examDate,
      startDate: data.startDate || new Date(),
      preferences: data.preferences || {}
    });

    // 学習週を生成
    await this.studyPlanRepository.generateWeeks(studyPlan.id);

    return studyPlan;
  }

  async updateStudyPlan(studyPlanId: number, data: UpdateStudyPlanRequest): Promise<StudyPlanEntity> {
    const studyPlan = await this.studyPlanRepository.update(studyPlanId, data);
    
    // 学習期間が変更された場合は週数を再生成
    if (data.totalWeeks) {
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

    const updatedPreferences = {
      ...studyPlan.preferences,
      ...preferences
    };

    return await this.studyPlanRepository.update(studyPlanId, {
      preferences: updatedPreferences
    });
  }

  async generateRecommendations(userId: number): Promise<{
    recommendedDailyHours: number;
    recommendedWeeklyHours: number;
    focusAreas: string[];
    studyTips: string[];
  }> {
    const studyPlan = await this.studyPlanRepository.findActiveByUserId(userId);
    const progress = studyPlan ? await this.studyPlanRepository.getProgress(studyPlan.id) : null;

    if (!studyPlan || !progress) {
      return {
        recommendedDailyHours: 3,
        recommendedWeeklyHours: 25,
        focusAreas: ['基礎理論', 'アルゴリズム', 'データベース'],
        studyTips: ['毎日一定の時間を確保しましょう', '苦手分野を重点的に学習しましょう']
      };
    }

    // 進捗に基づく推奨調整
    const isAhead = progress.actualStudyHours > progress.totalStudyHours;
    const isBehind = progress.actualStudyHours < progress.totalStudyHours * 0.7;

    let recommendedDailyHours = studyPlan.dailyHours;
    let recommendedWeeklyHours = studyPlan.weeklyHours;

    if (isBehind && progress.remainingDays > 0) {
      const catchUpHours = (progress.totalStudyHours - progress.actualStudyHours) / progress.remainingDays;
      recommendedDailyHours = Math.ceil(catchUpHours * 1.2); // 20%のバッファ
      recommendedWeeklyHours = recommendedDailyHours * 7;
    }

    return {
      recommendedDailyHours,
      recommendedWeeklyHours,
      focusAreas: this.getFocusAreas(progress.averageUnderstanding),
      studyTips: this.getStudyTips(isAhead, isBehind, progress.remainingDays)
    };
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