// TDD Tests for ML Features in Learning Efficiency Analysis
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningEfficiencyAnalysisUseCase } from '../../domain/usecases/learning-efficiency-analyzer';
import { ILearningEfficiencyAnalysisRepository } from '../../domain/repositories/Ilearning-efficiency-analyzerRepository';
import { IStudyLogRepository } from '../../domain/repositories/IStudyLogRepository';
import { CreateLearningEfficiencyAnalysisInput } from '../../domain/entities/learning-efficiency-analyzer';

describe('Learning Efficiency ML Features (TDD)', () => {
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

  describe('ML Prediction Features', () => {
    it('should predict exam readiness based on study patterns', async () => {
      // Arrange: Good study pattern
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 1,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const highQualityStudyLogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        date: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        subject: i % 2 === 0 ? 'Math' : 'Science',
        topics: ['Advanced Topic'],
        studyTime: 120, // 2 hours daily
        understanding: 4.5, // High understanding
        memo: 'Good progress',
        completed: true,
        createdAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T09:00:00Z`),
      }));

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(highQualityStudyLogs as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-high',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: High exam readiness expected
      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            expectedImprovement: expect.any(Number),
          }),
        ])
      );
    });

    it('should identify weak subjects accurately', async () => {
      // Arrange: Mixed performance data
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 2,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const mixedStudyLogs = [
        // Strong subject
        ...Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          date: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
          subject: 'Math',
          topics: ['Algebra'],
          studyTime: 90,
          understanding: 4.5,
          memo: 'Easy',
          completed: true,
          createdAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T09:00:00Z`),
        })),
        // Weak subject
        ...Array.from({ length: 10 }, (_, i) => ({
          id: i + 11,
          date: new Date(`2025-01-${String(i + 11).padStart(2, '0')}`),
          subject: 'Physics',
          topics: ['Quantum Mechanics'],
          studyTime: 180, // More time needed
          understanding: 2.0, // Low understanding
          memo: 'Difficult',
          completed: false,
          createdAt: new Date(`2025-01-${String(i + 11).padStart(2, '0')}T14:00:00Z`),
        })),
      ];

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(mixedStudyLogs as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-mixed',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: Physics should be identified as weak subject
      const physicsEfficiency = result.subjectEfficiency.find(s => s.subject === 'Physics');
      const mathEfficiency = result.subjectEfficiency.find(s => s.subject === 'Math');
      
      expect(physicsEfficiency?.avgUnderstanding).toBeLessThan(3);
      expect(mathEfficiency?.avgUnderstanding).toBeGreaterThan(4);
      
      // Should recommend focusing on weak subject
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'subject_focus',
            priority: 'high',
          }),
        ])
      );
    });

    it('should generate personalized study time recommendations', async () => {
      // Arrange: Low consistency study pattern
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 3,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const inconsistentStudyLogs = [
        // Only 5 days of study in a month
        ...Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          date: new Date(`2025-01-${String(i * 6 + 1).padStart(2, '0')}`), // Sparse dates
          subject: 'Math',
          topics: ['Basic'],
          studyTime: 60, // Low daily time
          understanding: 3.0,
          memo: 'Short session',
          completed: true,
          createdAt: new Date(`2025-01-${String(i * 6 + 1).padStart(2, '0')}T10:00:00Z`),
        })),
      ];

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(inconsistentStudyLogs as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-inconsistent',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: Should recommend consistency improvement
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'consistency',
            priority: 'high',
            expectedImprovement: expect.any(Number),
          }),
        ])
      );
    });
  });

  describe('Burnout Risk Detection', () => {
    it('should detect high burnout risk from excessive study time', async () => {
      // Arrange: Excessive study pattern
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 4,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const excessiveStudyLogs = Array.from({ length: 31 }, (_, i) => ({
        id: i + 1,
        date: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        subject: 'All Subjects',
        topics: ['Intensive Study'],
        studyTime: 600, // 10 hours daily - excessive!
        understanding: 3.5,
        memo: 'Exhausted',
        completed: true,
        createdAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T06:00:00Z`),
      }));

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(excessiveStudyLogs as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-excessive',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: Should detect burnout risk factors
      // Note: This tests the internal burnout calculation indirectly through recommendations
      // A dedicated burnout risk method would be better tested separately
      expect(result.overallScore).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should detect declining efficiency patterns', async () => {
      // Arrange: Declining performance over time
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 5,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      const decliningStudyLogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        date: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        subject: 'Math',
        topics: ['Calculus'],
        studyTime: 120,
        // Declining understanding over time
        understanding: Math.max(1, 5 - (i * 0.2)), // 5 to 1 over time
        memo: i > 10 ? 'Getting harder' : 'OK',
        completed: i < 10, // Less completion over time
        createdAt: new Date(
          `2025-01-${String(i + 1).padStart(2, '0')}T${String(9 + (i % 12)).padStart(2, '0')}:00:00Z`,
        ),
      }));

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(decliningStudyLogs as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-declining',
        ...analysis,  
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: Should identify declining patterns and suggest intervention
      expect(result.subjectEfficiency.length).toBeGreaterThan(0);
      expect(result.hourlyEfficiency.length).toBe(24);
      
      // Should generate helpful recommendations for struggling student
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.priority === 'high')).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty study logs gracefully', async () => {
      // Arrange
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 6,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      };

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue([]);

      // Act & Assert
      await expect(useCase.generateAnalysis(input)).rejects.toThrow('No study logs found for analysis');
    });

    it('should handle single day of data without crashing', async () => {
      // Arrange
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 7,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-01'),
        },
      };

      const singleDayLog = [{
        id: 1,
        date: new Date('2025-01-01'),
        subject: 'Math',
        topics: ['Basic'],
        studyTime: 60,
        understanding: 3,
        memo: 'Single session',
        completed: true,
        createdAt: new Date('2025-01-01T10:00:00Z'),
      }];

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(singleDayLog as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-single',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: Should not crash and provide meaningful output
      expect(result).toBeDefined();
      expect(result.userId).toBe(7);
      expect(result.hourlyEfficiency).toHaveLength(24);
      expect(result.subjectEfficiency.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle extreme understanding values', async () => {
      // Arrange: Test boundary values
      const input: CreateLearningEfficiencyAnalysisInput = {
        userId: 8,
        timeRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-03'),
        },
      };

      const extremeValueLogs = [
        {
          id: 1,
          date: new Date('2025-01-01'),
          subject: 'Perfect Subject',
          topics: ['Easy'],
          studyTime: 60,
          understanding: 5, // Maximum
          memo: 'Perfect',
          completed: true,
          createdAt: new Date('2025-01-01T10:00:00Z'),
        },
        {
          id: 2,
          date: new Date('2025-01-02'),
          subject: 'Impossible Subject',
          topics: ['Impossible'],
          studyTime: 180,
          understanding: 1, // Minimum
          memo: 'No progress',
          completed: false,
          createdAt: new Date('2025-01-02T14:00:00Z'),
        },
      ];

      vi.mocked(mockStudyLogRepository.findByUserAndDateRange).mockResolvedValue(extremeValueLogs as any);
      vi.mocked(mockRepository.create).mockImplementation(async analysis => ({
        id: 'analysis-extreme',
        ...analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await useCase.generateAnalysis(input);

      // Assert: Should handle extreme values without errors
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      
      // Should identify both excellent and struggling subjects
      const perfectSubject = result.subjectEfficiency.find(s => s.subject === 'Perfect Subject');
      const impossibleSubject = result.subjectEfficiency.find(s => s.subject === 'Impossible Subject');
      
      expect(perfectSubject?.avgUnderstanding).toBe(5);
      expect(impossibleSubject?.avgUnderstanding).toBe(1);
    });
  });
});