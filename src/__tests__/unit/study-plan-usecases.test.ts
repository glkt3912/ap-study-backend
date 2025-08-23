import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudyPlanUseCases } from '../../domain/usecases/StudyPlanUseCases';
import { IStudyPlanRepository } from '../../domain/repositories/IStudyPlanRepository';
import { IStudyRepository } from '../../domain/repositories/IStudyRepository';
import { StudyPlan, CreateStudyPlanRequest, UpdateStudyPlanRequest } from '../../domain/entities/StudyPlan';

describe('StudyPlanUseCases', () => {
  let studyPlanUseCases: StudyPlanUseCases;
  let mockStudyPlanRepository: Partial<IStudyPlanRepository>;
  let mockStudyRepository: Partial<IStudyRepository>;

  const mockStudyPlan: StudyPlan = {
    id: 1,
    userId: 123,
    name: 'Test Study Plan',
    description: 'Test Description',
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
        dailyHours: 3
      },
      planType: {
        isCustom: true,
        source: 'user_created'
      },
      preferences: {},
      metadata: {}
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockProgress = {
    id: 1,
    studyPlanId: 1,
    totalWeeks: 12,
    completedWeeks: 6,
    totalStudyHours: 300,
    actualStudyHours: 150,
    averageUnderstanding: 3.5,
    remainingDays: 60
  };

  beforeEach(() => {
    mockStudyPlanRepository = {
      findByUserId: vi.fn(),
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deactivate: vi.fn(),
      createFromTemplate: vi.fn(),
      generateWeeks: vi.fn(),
      getProgress: vi.fn()
    };

    mockStudyRepository = {
      findByUserId: vi.fn()
    };

    studyPlanUseCases = new StudyPlanUseCases(
      mockStudyPlanRepository as IStudyPlanRepository,
      mockStudyRepository as IStudyRepository
    );
  });

  describe('getUserStudyPlan', () => {
    it('should return study plan when found', async () => {
      mockStudyPlanRepository.findByUserId = vi.fn().mockResolvedValue(mockStudyPlan);

      const result = await studyPlanUseCases.getUserStudyPlan(123);

      expect(result).toEqual(mockStudyPlan);
      expect(mockStudyPlanRepository.findByUserId).toHaveBeenCalledWith(123);
    });

    it('should return null when study plan not found', async () => {
      mockStudyPlanRepository.findByUserId = vi.fn().mockResolvedValue(null);

      const result = await studyPlanUseCases.getUserStudyPlan(123);

      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      mockStudyPlanRepository.findByUserId = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(studyPlanUseCases.getUserStudyPlan(123))
        .rejects.toThrow('Database error');
    });
  });

  describe('createStudyPlan', () => {
    const createRequest: CreateStudyPlanRequest = {
      name: 'New Study Plan',
      description: 'New Description',
      templateId: 'template1',
      templateName: 'Basic Template',
      studyWeeksData: [],
      targetExamDate: new Date('2024-06-01'),
      startDate: new Date('2024-03-01'),
      settings: {
        timeSettings: { totalWeeks: 10, weeklyHours: 20, dailyHours: 3 },
        planType: { isCustom: true, source: 'user_created' },
        preferences: {},
        metadata: {}
      }
    };

    it('should create study plan successfully', async () => {
      mockStudyPlanRepository.create = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn().mockResolvedValue(undefined);

      const result = await studyPlanUseCases.createStudyPlan(123, createRequest);

      expect(result).toEqual(mockStudyPlan);
      expect(mockStudyPlanRepository.create).toHaveBeenCalledWith(123, expect.objectContaining({
        name: createRequest.name,
        description: createRequest.description,
        templateId: createRequest.templateId,
        templateName: createRequest.templateName,
        studyWeeksData: createRequest.studyWeeksData,
        targetExamDate: createRequest.targetExamDate,
        startDate: createRequest.startDate,
        settings: createRequest.settings
      }));
    });

    it('should generate weeks when studyWeeksData is empty', async () => {
      const requestWithoutWeeks = { ...createRequest, studyWeeksData: [] };
      mockStudyPlanRepository.create = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn().mockResolvedValue(undefined);

      await studyPlanUseCases.createStudyPlan(123, requestWithoutWeeks);

      expect(mockStudyPlanRepository.generateWeeks).toHaveBeenCalledWith(1);
    });

    it('should not generate weeks when studyWeeksData is provided', async () => {
      const requestWithWeeks = { ...createRequest, studyWeeksData: [{ week: 1, topics: [] }] };
      mockStudyPlanRepository.create = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn();

      await studyPlanUseCases.createStudyPlan(123, requestWithWeeks);

      expect(mockStudyPlanRepository.generateWeeks).not.toHaveBeenCalled();
    });

    it('should use default settings when not provided', async () => {
      const requestWithoutSettings = { ...createRequest };
      delete requestWithoutSettings.settings;
      delete requestWithoutSettings.startDate;

      mockStudyPlanRepository.create = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn().mockResolvedValue(undefined);

      await studyPlanUseCases.createStudyPlan(123, requestWithoutSettings);

      expect(mockStudyPlanRepository.create).toHaveBeenCalledWith(123, expect.objectContaining({
        startDate: expect.any(Date),
        settings: expect.objectContaining({
          timeSettings: {
            totalWeeks: 12,
            weeklyHours: 25,
            dailyHours: 3
          }
        })
      }));
    });
  });

  describe('updateStudyPlan', () => {
    const updateRequest: UpdateStudyPlanRequest = {
      name: 'Updated Plan',
      description: 'Updated Description',
      settings: {
        timeSettings: { totalWeeks: 16, weeklyHours: 30, dailyHours: 4 },
        planType: { isCustom: true, source: 'user_created' },
        preferences: {},
        metadata: {}
      }
    };

    it('should update study plan successfully', async () => {
      mockStudyPlanRepository.update = vi.fn().mockResolvedValue(mockStudyPlan);

      const result = await studyPlanUseCases.updateStudyPlan(1, updateRequest);

      expect(result).toEqual(mockStudyPlan);
      expect(mockStudyPlanRepository.update).toHaveBeenCalledWith(1, updateRequest);
    });

    it('should regenerate weeks when totalWeeks is updated', async () => {
      mockStudyPlanRepository.update = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn().mockResolvedValue(undefined);

      await studyPlanUseCases.updateStudyPlan(1, updateRequest);

      expect(mockStudyPlanRepository.generateWeeks).toHaveBeenCalledWith(1);
    });

    it('should not regenerate weeks when totalWeeks is not changed', async () => {
      const requestWithoutWeeks = { name: 'Updated Plan' };
      mockStudyPlanRepository.update = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn();

      await studyPlanUseCases.updateStudyPlan(1, requestWithoutWeeks);

      expect(mockStudyPlanRepository.generateWeeks).not.toHaveBeenCalled();
    });
  });

  describe('deleteStudyPlan', () => {
    it('should delete study plan successfully', async () => {
      mockStudyPlanRepository.delete = vi.fn().mockResolvedValue(undefined);

      await studyPlanUseCases.deleteStudyPlan(1);

      expect(mockStudyPlanRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('createFromTemplate', () => {
    it('should create study plan from template and deactivate existing plan', async () => {
      const existingPlan = { ...mockStudyPlan, id: 2 };
      mockStudyPlanRepository.findActiveByUserId = vi.fn().mockResolvedValue(existingPlan);
      mockStudyPlanRepository.deactivate = vi.fn().mockResolvedValue(undefined);
      mockStudyPlanRepository.createFromTemplate = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn().mockResolvedValue(undefined);

      const result = await studyPlanUseCases.createFromTemplate(123, 'advanced');

      expect(result).toEqual(mockStudyPlan);
      expect(mockStudyPlanRepository.deactivate).toHaveBeenCalledWith(2);
      expect(mockStudyPlanRepository.createFromTemplate).toHaveBeenCalledWith(123, 'advanced', undefined);
      expect(mockStudyPlanRepository.generateWeeks).toHaveBeenCalledWith(1);
    });

    it('should work without existing active plan', async () => {
      mockStudyPlanRepository.findActiveByUserId = vi.fn().mockResolvedValue(null);
      mockStudyPlanRepository.deactivate = vi.fn();
      mockStudyPlanRepository.createFromTemplate = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.generateWeeks = vi.fn().mockResolvedValue(undefined);

      const result = await studyPlanUseCases.createFromTemplate(123);

      expect(result).toEqual(mockStudyPlan);
      expect(mockStudyPlanRepository.deactivate).not.toHaveBeenCalled();
      expect(mockStudyPlanRepository.createFromTemplate).toHaveBeenCalledWith(123, 'default', undefined);
    });
  });

  describe('getStudyPlanProgress', () => {
    it('should return calculated progress with percentages', async () => {
      mockStudyPlanRepository.getProgress = vi.fn().mockResolvedValue(mockProgress);

      const result = await studyPlanUseCases.getStudyPlanProgress(1);

      expect(result).toEqual({
        ...mockProgress,
        progressPercentage: 50, // 6/12 * 100
        studyHoursPercentage: 50, // 150/300 * 100
        isOnTrack: false // 150 < 300 * 0.8 (240)
      });
    });

    it('should return isOnTrack true when study hours are sufficient', async () => {
      const goodProgress = { ...mockProgress, actualStudyHours: 250 };
      mockStudyPlanRepository.getProgress = vi.fn().mockResolvedValue(goodProgress);

      const result = await studyPlanUseCases.getStudyPlanProgress(1);

      expect(result.isOnTrack).toBe(true);
    });
  });

  describe('adjustStudyPlan', () => {
    const preferences = {
      focusAreas: ['database', 'network'],
      studyStyle: 'intensive' as const,
      difficultyLevel: 'advanced' as const
    };

    it('should adjust study plan preferences successfully', async () => {
      mockStudyPlanRepository.findById = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.update = vi.fn().mockResolvedValue(mockStudyPlan);

      const result = await studyPlanUseCases.adjustStudyPlan(1, preferences);

      expect(result).toEqual(mockStudyPlan);
      expect(mockStudyPlanRepository.update).toHaveBeenCalledWith(1, {
        settings: expect.objectContaining({
          preferences: expect.objectContaining(preferences)
        })
      });
    });

    it('should throw error when study plan not found', async () => {
      mockStudyPlanRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(studyPlanUseCases.adjustStudyPlan(1, preferences))
        .rejects.toThrow('Study plan not found');
    });
  });

  describe('generateRecommendations', () => {
    it('should return default recommendations when no study plan exists', async () => {
      mockStudyPlanRepository.findActiveByUserId = vi.fn().mockResolvedValue(null);

      const result = await studyPlanUseCases.generateRecommendations(123);

      expect(result).toEqual({
        recommendedDailyHours: 3,
        recommendedWeeklyHours: 25,
        focusAreas: ['基礎理論', 'アルゴリズム', 'データベース'],
        studyTips: ['毎日一定の時間を確保しましょう', '苦手分野を重点的に学習しましょう']
      });
    });

    it('should return personalized recommendations when study plan exists', async () => {
      mockStudyPlanRepository.findActiveByUserId = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.getProgress = vi.fn().mockResolvedValue(mockProgress);

      const result = await studyPlanUseCases.generateRecommendations(123);

      expect(result).toMatchObject({
        recommendedDailyHours: expect.any(Number),
        recommendedWeeklyHours: expect.any(Number),
        focusAreas: expect.any(Array),
        studyTips: expect.any(Array)
      });
      expect(result.focusAreas.length).toBeGreaterThan(0);
      expect(result.studyTips.length).toBeGreaterThan(0);
    });

    it('should recommend catch-up hours when behind schedule', async () => {
      const behindProgress = {
        ...mockProgress,
        actualStudyHours: 100, // Well below 70% of 300 (210)
        remainingDays: 30
      };
      
      mockStudyPlanRepository.findActiveByUserId = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.getProgress = vi.fn().mockResolvedValue(behindProgress);

      const result = await studyPlanUseCases.generateRecommendations(123);

      expect(result.recommendedDailyHours).toBeGreaterThan(3);
      expect(result.studyTips).toContain('学習ペースを上げる必要があります');
    });

    it('should provide appropriate focus areas based on understanding level', async () => {
      const lowUnderstanding = { ...mockProgress, averageUnderstanding: 2.5 };
      mockStudyPlanRepository.findActiveByUserId = vi.fn().mockResolvedValue(mockStudyPlan);
      mockStudyPlanRepository.getProgress = vi.fn().mockResolvedValue(lowUnderstanding);

      const result = await studyPlanUseCases.generateRecommendations(123);

      expect(result.focusAreas).toContain('基礎理論');
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors in createStudyPlan', async () => {
      mockStudyPlanRepository.create = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(studyPlanUseCases.createStudyPlan(123, {
        name: 'Test Plan',
        description: 'Test'
      })).rejects.toThrow('Database connection failed');
    });

    it('should propagate repository errors in updateStudyPlan', async () => {
      mockStudyPlanRepository.update = vi.fn().mockRejectedValue(new Error('Update failed'));

      await expect(studyPlanUseCases.updateStudyPlan(1, { name: 'Updated' }))
        .rejects.toThrow('Update failed');
    });
  });
});