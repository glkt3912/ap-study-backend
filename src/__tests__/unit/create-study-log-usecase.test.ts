import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateStudyLogUseCase, CreateStudyLogRequest } from '../../domain/usecases/CreateStudyLog';
import { IStudyLogRepository } from '../../domain/repositories/IStudyLogRepository';
import { StudyLogEntity, StudyLogData } from '../../domain/entities/StudyLog';

describe('CreateStudyLogUseCase', () => {
  let createStudyLogUseCase: CreateStudyLogUseCase;
  let mockStudyLogRepository: Partial<IStudyLogRepository>;

  const validRequest: CreateStudyLogRequest = {
    date: new Date('2024-01-15'),
    subject: '基礎理論',
    topics: ['論理演算', 'データ構造'],
    studyTime: 120,
    understanding: 4,
    memo: 'テストメモ'
  };

  const mockStudyLogEntity: StudyLogEntity = {
    id: 1,
    date: validRequest.date,
    subject: validRequest.subject,
    topics: validRequest.topics,
    studyTime: validRequest.studyTime,
    understanding: validRequest.understanding,
    memo: validRequest.memo,
    createdAt: new Date(),
    updatedAt: new Date()
  } as StudyLogEntity;

  beforeEach(() => {
    mockStudyLogRepository = {
      create: vi.fn(),
      findByDateRange: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByUserId: vi.fn()
    };

    createStudyLogUseCase = new CreateStudyLogUseCase(
      mockStudyLogRepository as IStudyLogRepository
    );

    // デフォルトで重複チェック用のfindByDateRangeは空配列を返す
    mockStudyLogRepository.findByDateRange = vi.fn().mockResolvedValue([]);
  });

  describe('execute with CreateStudyLogRequest', () => {
    it('should create study log successfully with valid request', async () => {
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(validRequest);

      expect(result).toEqual(mockStudyLogEntity);
      expect(mockStudyLogRepository.create).toHaveBeenCalledWith({
        date: validRequest.date,
        subject: validRequest.subject,
        topics: validRequest.topics,
        studyTime: validRequest.studyTime,
        understanding: validRequest.understanding,
        memo: validRequest.memo
      });
    });

    it('should create study log without optional memo', async () => {
      const requestWithoutMemo = { ...validRequest };
      delete requestWithoutMemo.memo;

      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(requestWithoutMemo);

      expect(result).toEqual(mockStudyLogEntity);
      expect(mockStudyLogRepository.create).toHaveBeenCalledWith({
        date: requestWithoutMemo.date,
        subject: requestWithoutMemo.subject,
        topics: requestWithoutMemo.topics,
        studyTime: requestWithoutMemo.studyTime,
        understanding: requestWithoutMemo.understanding,
        memo: ""
      });
    });

    it('should call validateRequest and check for duplicates', async () => {
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);
      mockStudyLogRepository.findByDateRange = vi.fn().mockResolvedValue([]);

      await createStudyLogUseCase.execute(validRequest);

      expect(mockStudyLogRepository.findByDateRange).toHaveBeenCalledWith(
        new Date(2024, 0, 15), // Start of the day
        new Date(2024, 0, 16)  // Start of next day
      );
    });
  });

  describe('execute with StudyLogData', () => {
    it('should handle StudyLogData format with id', async () => {
      const studyLogData: StudyLogData = {
        id: 5,
        date: validRequest.date,
        subject: validRequest.subject,
        topics: validRequest.topics,
        studyTime: validRequest.studyTime,
        understanding: validRequest.understanding,
        memo: validRequest.memo
      };

      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);
      mockStudyLogRepository.findByDateRange = vi.fn().mockResolvedValue([]);

      const result = await createStudyLogUseCase.execute(studyLogData);

      expect(result).toEqual(mockStudyLogEntity);
      // When id is present, duplicate check should be skipped
      expect(mockStudyLogRepository.findByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should throw error for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const invalidRequest = { ...validRequest, date: futureDate };

      await expect(createStudyLogUseCase.execute(invalidRequest))
        .rejects.toThrow('未来の日付は記録できません');
    });

    it('should throw error for empty subject', async () => {
      const invalidRequest = { ...validRequest, subject: '   ' };

      await expect(createStudyLogUseCase.execute(invalidRequest))
        .rejects.toThrow('科目名は必須です');
    });

    it('should throw error for duplicate subject on same date', async () => {
      const existingLog = {
        id: 2,
        date: validRequest.date,
        subject: validRequest.subject,
        topics: ['existing topic'],
        studyTime: 60,
        understanding: 3
      };

      mockStudyLogRepository.findByDateRange = vi.fn().mockResolvedValue([existingLog]);

      await expect(createStudyLogUseCase.execute(validRequest))
        .rejects.toThrow(`${validRequest.date.toDateString()}の${validRequest.subject}は既に記録されています`);
    });

    it('should allow same subject on different date', async () => {
      const existingLog = {
        id: 2,
        date: new Date('2024-01-14'), // Different date
        subject: validRequest.subject,
        topics: ['existing topic'],
        studyTime: 60,
        understanding: 3
      };

      mockStudyLogRepository.findByDateRange = vi.fn().mockResolvedValue([existingLog]);
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(validRequest);

      expect(result).toEqual(mockStudyLogEntity);
    });

    it('should allow different subject on same date', async () => {
      const existingLog = {
        id: 2,
        date: validRequest.date,
        subject: 'アルゴリズム', // Different subject
        topics: ['existing topic'],
        studyTime: 60,
        understanding: 3
      };

      mockStudyLogRepository.findByDateRange = vi.fn().mockResolvedValue([existingLog]);
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(validRequest);

      expect(result).toEqual(mockStudyLogEntity);
    });
  });

  describe('edge cases', () => {
    it('should handle today\'s date correctly', async () => {
      const todayRequest = { ...validRequest, date: new Date() };
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(todayRequest);

      expect(result).toEqual(mockStudyLogEntity);
    });

    it('should reject zero study time due to validation', async () => {
      const zeroTimeRequest = { ...validRequest, studyTime: 0 };

      await expect(createStudyLogUseCase.execute(zeroTimeRequest))
        .rejects.toThrow('学習時間は0より大きい値を設定してください');
    });

    it('should handle minimum understanding level', async () => {
      const minUnderstandingRequest = { ...validRequest, understanding: 1 };
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(minUnderstandingRequest);

      expect(result).toEqual(mockStudyLogEntity);
    });

    it('should handle maximum understanding level', async () => {
      const maxUnderstandingRequest = { ...validRequest, understanding: 5 };
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(maxUnderstandingRequest);

      expect(result).toEqual(mockStudyLogEntity);
    });

    it('should handle empty topics array', async () => {
      const emptyTopicsRequest = { ...validRequest, topics: [] };
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      const result = await createStudyLogUseCase.execute(emptyTopicsRequest);

      expect(result).toEqual(mockStudyLogEntity);
    });
  });

  describe('error handling', () => {
    it('should propagate repository creation errors', async () => {
      mockStudyLogRepository.create = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(createStudyLogUseCase.execute(validRequest))
        .rejects.toThrow('Database connection failed');
    });

    it('should propagate repository findByDateRange errors', async () => {
      mockStudyLogRepository.findByDateRange = vi.fn().mockRejectedValue(new Error('Query failed'));

      await expect(createStudyLogUseCase.execute(validRequest))
        .rejects.toThrow('Query failed');
    });

    it('should handle StudyLogEntity creation errors', async () => {
      // StudyLogEntityの作成でエラーが発生する場合をテスト
      // 実際のエラーはStudyLogEntityのコンストラクタ内のバリデーションに依存
      const invalidDataRequest = { ...validRequest, understanding: -1 };

      // StudyLogEntity内でバリデーションエラーが発生することを想定
      await expect(createStudyLogUseCase.execute(invalidDataRequest))
        .rejects.toThrow();
    });
  });

  describe('date range calculation', () => {
    it('should calculate correct date range for duplicate check', async () => {
      const testDate = new Date('2024-06-15T14:30:00');
      const request = { ...validRequest, date: testDate };
      
      mockStudyLogRepository.create = vi.fn().mockResolvedValue(mockStudyLogEntity);

      await createStudyLogUseCase.execute(request);

      expect(mockStudyLogRepository.findByDateRange).toHaveBeenCalledWith(
        new Date(2024, 5, 15), // June 15, 2024 00:00:00
        new Date(2024, 5, 16)  // June 16, 2024 00:00:00
      );
    });
  });
});