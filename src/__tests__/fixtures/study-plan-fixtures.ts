import {
  StudyPlan,
  CreateStudyPlanRequest,
  UpdateStudyPlanRequest,
  StudyPlanPreferences,
} from '../../domain/entities/StudyPlan';

export class StudyPlanFixtures {
  static createBasicStudyPlan(overrides?: Partial<StudyPlan>): StudyPlan {
    return {
      id: 1,
      userId: 123,
      name: 'AP試験対策プラン',
      description: '応用情報技術者試験の学習計画',
      totalWeeks: 12,
      weeklyHours: 25,
      dailyHours: 3,
      targetExamDate: new Date('2024-06-01'),
      startDate: new Date('2024-03-01'),
      isActive: true,
      settings: {
        timeSettings: {
          totalWeeks: 12,
          weeklyHours: 25,
          dailyHours: 3,
        },
        planType: {
          isCustom: true,
          source: 'user_created',
        },
        preferences: {
          focusAreas: ['基礎理論', 'アルゴリズム'],
          studyStyle: 'balanced',
          difficultyLevel: 'intermediate',
          reviewFrequency: 3,
          breakDuration: 15,
          notificationEnabled: true,
        },
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
        },
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createAdvancedStudyPlan(overrides?: Partial<StudyPlan>): StudyPlan {
    return this.createBasicStudyPlan({
      name: '上級者向けAP試験対策',
      description: '経験者向けの集中学習プラン',
      totalWeeks: 8,
      weeklyHours: 35,
      dailyHours: 5,
      settings: {
        timeSettings: {
          totalWeeks: 8,
          weeklyHours: 35,
          dailyHours: 5,
        },
        planType: {
          isCustom: true,
          source: 'template_advanced',
        },
        preferences: {
          focusAreas: ['システム開発', 'プロジェクトマネジメント', '情報セキュリティ'],
          studyStyle: 'intensive',
          difficultyLevel: 'advanced',
          reviewFrequency: 2,
          breakDuration: 10,
          notificationEnabled: true,
        },
        metadata: {
          version: '2.0',
          templateUsed: 'advanced',
          lastUpdated: new Date().toISOString(),
        },
      },
      ...overrides,
    });
  }

  static createInactiveStudyPlan(overrides?: Partial<StudyPlan>): StudyPlan {
    return this.createBasicStudyPlan({
      id: 2,
      name: '過去の学習プラン',
      isActive: false,
      ...overrides,
    });
  }

  static createCreateStudyPlanRequest(overrides?: Partial<CreateStudyPlanRequest>): CreateStudyPlanRequest {
    return {
      name: 'New Study Plan',
      description: 'New study plan description',
      templateId: 'basic-template',
      templateName: 'Basic Template',
      studyWeeksData: [],
      targetExamDate: new Date('2024-06-01'),
      startDate: new Date('2024-03-01'),
      settings: {
        timeSettings: {
          totalWeeks: 12,
          weeklyHours: 25,
          dailyHours: 3,
        },
        planType: {
          isCustom: true,
          source: 'user_created',
        },
        preferences: {
          focusAreas: ['基礎理論'],
          studyStyle: 'balanced',
          difficultyLevel: 'intermediate',
          reviewFrequency: 3,
          breakDuration: 15,
          notificationEnabled: false,
        },
        metadata: {},
      },
      ...overrides,
    };
  }

  static createUpdateStudyPlanRequest(overrides?: Partial<UpdateStudyPlanRequest>): UpdateStudyPlanRequest {
    return {
      name: 'Updated Study Plan',
      description: 'Updated description',
      totalWeeks: 16,
      weeklyHours: 30,
      dailyHours: 4,
      targetExamDate: new Date('2024-07-01'),
      isActive: true,
      settings: {
        timeSettings: {
          totalWeeks: 16,
          weeklyHours: 30,
          dailyHours: 4,
        },
        planType: {
          isCustom: true,
          source: 'user_updated',
        },
        preferences: {
          focusAreas: ['アルゴリズム', 'データベース'],
          studyStyle: 'intensive',
          difficultyLevel: 'advanced',
          reviewFrequency: 2,
          breakDuration: 10,
          notificationEnabled: true,
        },
        metadata: {
          lastModified: new Date().toISOString(),
        },
      },
      ...overrides,
    };
  }

  static createStudyPlanPreferences(overrides?: Partial<StudyPlanPreferences>): StudyPlanPreferences {
    return {
      focusAreas: ['基礎理論', 'アルゴリズム', 'データベース'],
      studyStyle: 'balanced',
      difficultyLevel: 'intermediate',
      reviewFrequency: 3,
      breakDuration: 15,
      notificationEnabled: true,
      ...overrides,
    };
  }

  static createStudyPlanProgress() {
    return {
      id: 1,
      studyPlanId: 1,
      totalWeeks: 12,
      completedWeeks: 6,
      totalStudyHours: 300,
      actualStudyHours: 150,
      averageUnderstanding: 3.5,
      remainingDays: 60,
      progressPercentage: 50,
      studyHoursPercentage: 50,
      isOnTrack: false,
    };
  }

  static createStudyRecommendations() {
    return {
      recommendedDailyHours: 3,
      recommendedWeeklyHours: 21,
      focusAreas: ['基礎理論', 'アルゴリズム', 'データベース'],
      studyTips: [
        '毎日一定の時間を確保しましょう',
        '苦手分野を重点的に学習しましょう',
        '定期的な復習で記憶を定着させましょう',
      ],
    };
  }

  static createCatchUpRecommendations() {
    return {
      recommendedDailyHours: 5,
      recommendedWeeklyHours: 35,
      focusAreas: ['基礎理論', 'コンピュータシステム'],
      studyTips: [
        '学習ペースを上げる必要があります',
        '重要分野に集中して学習しましょう',
        '定期的な復習で記憶を定着させましょう',
        '苦手分野は早めに対策しましょう',
      ],
    };
  }

  static createStudyWeeksData() {
    return [
      {
        week: 1,
        topics: ['基礎理論', '論理演算'],
        estimatedHours: 25,
        difficultyLevel: 'basic',
      },
      {
        week: 2,
        topics: ['データ構造', 'アルゴリズム'],
        estimatedHours: 25,
        difficultyLevel: 'intermediate',
      },
      {
        week: 3,
        topics: ['データベース', 'SQL'],
        estimatedHours: 25,
        difficultyLevel: 'intermediate',
      },
    ];
  }
}

export const STUDY_PLAN_TEST_CONSTANTS = {
  USER_IDS: {
    VALID: 123,
    INVALID: -1,
    NONEXISTENT: 99999,
  },
  STUDY_PLAN_IDS: {
    VALID: 1,
    INVALID: -1,
    NONEXISTENT: 99999,
  },
  TEMPLATE_NAMES: {
    BASIC: 'basic',
    ADVANCED: 'advanced',
    CUSTOM: 'custom',
    INVALID: 'nonexistent',
  },
  DATES: {
    PAST: new Date('2023-01-01'),
    CURRENT: new Date(),
    FUTURE: new Date('2024-12-01'),
    TARGET_EXAM: new Date('2024-06-01'),
  },
  SETTINGS: {
    MIN_WEEKS: 1,
    MAX_WEEKS: 52,
    MIN_HOURS_DAILY: 0.5,
    MAX_HOURS_DAILY: 24,
    MIN_HOURS_WEEKLY: 1,
    MAX_HOURS_WEEKLY: 168,
  },
};

export const STUDY_PLAN_TEST_ERRORS = {
  VALIDATION_FAILED: (field: string) => `Validation failed for field: ${field}`,
  STUDY_PLAN_NOT_FOUND: (id: number) => `Study plan not found: ${id}`,
  USER_NOT_FOUND: (id: number) => `User not found: ${id}`,
  TEMPLATE_NOT_FOUND: (name: string) => `Template not found: ${name}`,
  DATABASE_CONNECTION_FAILED: new Error('Database connection failed'),
  UNAUTHORIZED_ACCESS: new Error('Unauthorized access to study plan'),
  DUPLICATE_ACTIVE_PLAN: new Error('User already has an active study plan'),
};
