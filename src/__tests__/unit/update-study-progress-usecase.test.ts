import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { UpdateStudyProgressUseCase } from '../../domain/usecases/UpdateStudyProgress';
import { IStudyRepository } from '../../domain/repositories/IStudyRepository';
import { StudyWeekEntity } from '../../domain/entities/StudyWeek';

describe('UpdateStudyProgressUseCase', () => {
  let useCase: UpdateStudyProgressUseCase;
  let mockStudyRepository: {
    findWeekByNumber: Mock;
    updateWeek: Mock;
    updateDayProgress: Mock;
  };
  let mockStudyWeek: StudyWeekEntity;

  beforeEach(() => {
    // Create mock study week entity
    mockStudyWeek = {
      id: 'week-1',
      weekNumber: 1,
      days: [
        {
          dayIndex: 0,
          topic: '基礎理論',
          estimatedTime: 120,
          actualTime: 0,
          completed: false,
          understanding: 0,
          memo: '',
        },
        {
          dayIndex: 1,
          topic: 'アルゴリズム',
          estimatedTime: 90,
          actualTime: 0,
          completed: false,
          understanding: 0,
          memo: '',
        },
      ],
      completeTask: vi.fn().mockReturnThis(),
      uncompleteTask: vi.fn().mockReturnThis(),
      updateUnderstanding: vi.fn().mockReturnThis(),
    } as unknown as StudyWeekEntity;

    // Create mock repository
    mockStudyRepository = {
      findWeekByNumber: vi.fn(),
      updateWeek: vi.fn(),
      updateDayProgress: vi.fn(),
    };

    // Create use case with mocked repository
    useCase = new UpdateStudyProgressUseCase(mockStudyRepository as unknown as IStudyRepository);
  });

  describe('completeTask', () => {
    it('should complete a task successfully', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateWeek.mockResolvedValue({ ...mockStudyWeek, days: [{ ...mockStudyWeek.days[0], completed: true }, mockStudyWeek.days[1]] });

      // Act
      const result = await useCase.completeTask(1, 0);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledWith(1);
      expect(mockStudyWeek.completeTask).toHaveBeenCalledWith(0);
      expect(mockStudyRepository.updateWeek).toHaveBeenCalledWith(mockStudyWeek);
      expect(result).toBeDefined();
    });

    it('should throw error when week is not found', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.completeTask(999, 0)).rejects.toThrow('第999週の計画が見つかりません');
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledWith(999);
    });

    it('should throw error for invalid day index (negative)', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);

      // Act & Assert
      await expect(useCase.completeTask(1, -1)).rejects.toThrow('無効な日のインデックスです');
    });

    it('should throw error for invalid day index (too large)', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);

      // Act & Assert
      await expect(useCase.completeTask(1, 2)).rejects.toThrow('無効な日のインデックスです');
    });
  });

  describe('uncompleteTask', () => {
    it('should uncomplete a task successfully', async () => {
      // Arrange
      const completedWeek = { ...mockStudyWeek, days: [{ ...mockStudyWeek.days[0], completed: true }, mockStudyWeek.days[1]] };
      mockStudyRepository.findWeekByNumber.mockResolvedValue(completedWeek);
      mockStudyRepository.updateWeek.mockResolvedValue({ ...completedWeek, days: [{ ...completedWeek.days[0], completed: false }, completedWeek.days[1]] });

      // Act
      const result = await useCase.uncompleteTask(1, 0);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledWith(1);
      expect(completedWeek.uncompleteTask).toHaveBeenCalledWith(0);
      expect(mockStudyRepository.updateWeek).toHaveBeenCalledWith(completedWeek);
      expect(result).toBeDefined();
    });

    it('should throw error when week is not found', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.uncompleteTask(999, 0)).rejects.toThrow('第999週の計画が見つかりません');
    });

    it('should throw error for invalid day index', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);

      // Act & Assert
      await expect(useCase.uncompleteTask(1, -1)).rejects.toThrow('無効な日のインデックスです');
      await expect(useCase.uncompleteTask(1, 2)).rejects.toThrow('無効な日のインデックスです');
    });
  });

  describe('updateStudyTime', () => {
    it('should update study time successfully', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act
      await useCase.updateStudyTime(1, 0, 120);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledWith(1);
      expect(mockStudyRepository.updateDayProgress).toHaveBeenCalledWith('week-1', 0, {
        actualTime: 120,
      });
    });

    it('should throw error for negative study time', async () => {
      // Act & Assert
      await expect(useCase.updateStudyTime(1, 0, -30)).rejects.toThrow('学習時間は0以上で入力してください');
    });

    it('should throw error when week is not found', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.updateStudyTime(999, 0, 120)).rejects.toThrow('第999週の計画が見つかりません');
    });

    it('should throw error for invalid day index', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);

      // Act & Assert
      await expect(useCase.updateStudyTime(1, -1, 120)).rejects.toThrow('無効な日のインデックスです');
      await expect(useCase.updateStudyTime(1, 2, 120)).rejects.toThrow('無効な日のインデックスです');
    });

    it('should accept zero study time', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act
      await useCase.updateStudyTime(1, 0, 0);

      // Assert
      expect(mockStudyRepository.updateDayProgress).toHaveBeenCalledWith('week-1', 0, {
        actualTime: 0,
      });
    });
  });

  describe('updateUnderstanding', () => {
    it('should update understanding successfully', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateWeek.mockResolvedValue({ ...mockStudyWeek, days: [{ ...mockStudyWeek.days[0], understanding: 8 }, mockStudyWeek.days[1]] });

      // Act
      const result = await useCase.updateUnderstanding(1, 0, 8);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledWith(1);
      expect(mockStudyWeek.updateUnderstanding).toHaveBeenCalledWith(0, 8);
      expect(mockStudyRepository.updateWeek).toHaveBeenCalledWith(mockStudyWeek);
      expect(result).toBeDefined();
    });

    it('should throw error when week is not found', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.updateUnderstanding(999, 0, 5)).rejects.toThrow('第999週の計画が見つかりません');
    });

    it('should throw error for invalid day index', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);

      // Act & Assert
      await expect(useCase.updateUnderstanding(1, -1, 5)).rejects.toThrow('無効な日のインデックスです');
      await expect(useCase.updateUnderstanding(1, 2, 5)).rejects.toThrow('無効な日のインデックスです');
    });

    it('should handle understanding validation through domain entity', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyWeek.updateUnderstanding = vi.fn().mockImplementation(() => {
        throw new Error('理解度は1-10の範囲で入力してください');
      });

      // Act & Assert
      await expect(useCase.updateUnderstanding(1, 0, 11)).rejects.toThrow('理解度は1-10の範囲で入力してください');
    });
  });

  describe('updateMemo', () => {
    it('should update memo successfully', async () => {
      // Arrange
      const memo = 'この分野は復習が必要です';
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act
      await useCase.updateMemo(1, 0, memo);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledWith(1);
      expect(mockStudyRepository.updateDayProgress).toHaveBeenCalledWith('week-1', 0, {
        memo: memo,
      });
    });

    it('should update memo with empty string', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act
      await useCase.updateMemo(1, 0, '');

      // Assert
      expect(mockStudyRepository.updateDayProgress).toHaveBeenCalledWith('week-1', 0, {
        memo: '',
      });
    });

    it('should throw error when week is not found', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.updateMemo(999, 0, 'memo')).rejects.toThrow('第999週の計画が見つかりません');
    });

    it('should throw error for invalid day index', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);

      // Act & Assert
      await expect(useCase.updateMemo(1, -1, 'memo')).rejects.toThrow('無効な日のインデックスです');
      await expect(useCase.updateMemo(1, 2, 'memo')).rejects.toThrow('無効な日のインデックスです');
    });

    it('should handle long memo text', async () => {
      // Arrange
      const longMemo = 'A'.repeat(1000);
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act
      await useCase.updateMemo(1, 0, longMemo);

      // Assert
      expect(mockStudyRepository.updateDayProgress).toHaveBeenCalledWith('week-1', 0, {
        memo: longMemo,
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(useCase.completeTask(1, 0)).rejects.toThrow('Database connection failed');
    });

    it('should handle entity method errors gracefully', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyWeek.completeTask = vi.fn().mockImplementation(() => {
        throw new Error('Task cannot be completed');
      });

      // Act & Assert
      await expect(useCase.completeTask(1, 0)).rejects.toThrow('Task cannot be completed');
    });

    it('should handle updateWeek repository errors', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateWeek.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(useCase.completeTask(1, 0)).rejects.toThrow('Update failed');
    });

    it('should handle updateDayProgress repository errors', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockRejectedValue(new Error('Progress update failed'));

      // Act & Assert
      await expect(useCase.updateStudyTime(1, 0, 120)).rejects.toThrow('Progress update failed');
    });
  });

  describe('Integration scenarios', () => {
    it('should complete a full study session workflow', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateWeek.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act - Complete a full workflow
      await useCase.updateStudyTime(1, 0, 120);
      await useCase.updateUnderstanding(1, 0, 8);
      await useCase.updateMemo(1, 0, '基礎理論の復習完了');
      await useCase.completeTask(1, 0);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledTimes(4);
      expect(mockStudyRepository.updateDayProgress).toHaveBeenCalledTimes(2);
      expect(mockStudyRepository.updateWeek).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple day updates in sequence', async () => {
      // Arrange
      mockStudyRepository.findWeekByNumber.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateWeek.mockResolvedValue(mockStudyWeek);
      mockStudyRepository.updateDayProgress.mockResolvedValue(undefined);

      // Act - Update both days
      await useCase.completeTask(1, 0);
      await useCase.completeTask(1, 1);

      // Assert
      expect(mockStudyRepository.findWeekByNumber).toHaveBeenCalledTimes(2);
      expect(mockStudyWeek.completeTask).toHaveBeenCalledWith(0);
      expect(mockStudyWeek.completeTask).toHaveBeenCalledWith(1);
    });
  });
});