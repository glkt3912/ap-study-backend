// TDD Red Phase: Learning Efficiency Analysis
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningEfficiencyAnalysisUseCase } from '../../domain/usecases/LearningEfficiencyAnalyzer';
import { ILearningEfficiencyAnalysisRepository } from '../../domain/repositories/ILearningEfficiencyAnalyzerRepository';
import { IStudyLogRepository } from '../../domain/repositories/IStudyLogRepository';
import { CreateLearningEfficiencyAnalysisInput } from '../../domain/entities/LearningEfficiencyAnalyzer';

describe('LearningEfficiencyAnalysisUseCase', () => {
  let useCase: LearningEfficiencyAnalysisUseCase;
  let mockRepository: ILearningEfficiencyAnalysisRepository;
  let mockStudyLogRepository: IStudyLogRepository;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as ILearningEfficiencyAnalysisRepository;

    mockStudyLogRepository = {
      findByUserAndDateRange: vi.fn(),
    } as unknown as IStudyLogRepository;

    useCase = new LearningEfficiencyAnalysisUseCase(mockRepository, mockStudyLogRepository);
  });

  describe('generateAnalysis', () => {
    it('should fail when no study logs exist (Red phase)', async () => {
      // Arrange
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 123,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue([]);

      // Act & Assert - This should fail initially
      await expect(useCase.generateAnalysis(input)).rejects.toThrow('No study logs found for analysis');
    });

    it('should calculate hourly efficiency correctly', async () => {
      // Arrange
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 123,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const mockStudyLogs = [
        {
          id: 1,
          date: new Date('2025-01-01'),
          subject: 'Math',
          topics: ['Algebra', 'Calculus'],
          studyTime: 120,
          understanding: 4,
          memo: 'Good progress',
          completed: true,
          createdAt: new Date('2025-01-01T09:00:00Z'),
        },
        {
          id: 2,
          date: new Date('2025-01-01'),
          subject: 'Science',
          topics: ['Physics'],
          studyTime: 90,
          understanding: 3,
          memo: '',
          completed: false,
          createdAt: new Date('2025-01-01T14:00:00Z'),
        },
      ] as any[];

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(mockStudyLogs);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis123',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(123);
      expect(result.hourlyEfficiency).toHaveLength(24);
      expect(result.subjectEfficiency.length).toBeGreaterThan(0);
    });

    it('should generate meaningful recommendations', async () => {
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 123,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const mockStudyLogs = [
        {
          id: 1,
          date: new Date('2025-01-01'),
          subject: 'Difficult Subject',
          topics: ['Hard Topic'],
          studyTime: 180,
          understanding: 2, // Low understanding
          memo: 'Struggling',
          completed: false,
          createdAt: new Date('2025-01-01T09:00:00Z'),
        },
      ] as any[];

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(mockStudyLogs);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis123',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'subject_focus',
            priority: 'high',
          }),
        ]),
      );
    });
  });
});
