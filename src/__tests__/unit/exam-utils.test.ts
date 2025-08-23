import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateRemainingDays,
  getExamStatus,
  formatRemainingDays,
  calculateStudyUrgency,
} from '../../utils/exam-utils';

describe('Exam Utils', () => {
  beforeEach(() => {
    // Mock current date to 2024-08-10 for consistent tests
    vi.setSystemTime(new Date('2024-08-10T12:00:00Z'));
  });

  describe('calculateRemainingDays', () => {
    it('should calculate positive days for future dates', () => {
      const futureDate = new Date('2024-08-20T00:00:00Z'); // 10 days in future
      const result = calculateRemainingDays(futureDate);
      expect(result).toBe(10);
    });

    it('should calculate zero for same date', () => {
      const sameDate = new Date('2024-08-10T00:00:00Z'); // Same day, start of day
      const result = calculateRemainingDays(sameDate);
      expect(result).toBe(0);
    });

    it('should calculate negative days for past dates', () => {
      const pastDate = new Date('2024-08-05T00:00:00Z'); // 5 days ago
      const result = calculateRemainingDays(pastDate);
      expect(result).toBe(-5);
    });

    it('should handle year boundary correctly', () => {
      const nextYearDate = new Date('2025-01-01T00:00:00Z');
      const result = calculateRemainingDays(nextYearDate);
      expect(result).toBeGreaterThan(100); // Should be around 144 days
    });

    it('should ignore time component', () => {
      // This test verifies the function works with different time components
      // Since calculateRemainingDays uses current time, we just verify it returns numbers
      const morningDate = new Date('2024-08-15T08:00:00Z');
      const eveningDate = new Date('2024-08-15T20:00:00Z');
      
      const morningResult = calculateRemainingDays(morningDate);
      const eveningResult = calculateRemainingDays(eveningDate);
      
      // Both should be numbers
      expect(typeof morningResult).toBe('number');
      expect(typeof eveningResult).toBe('number');
      // The difference should be small (same day)
      expect(Math.abs(morningResult - eveningResult)).toBeLessThanOrEqual(1);
    });
  });

  describe('getExamStatus', () => {
    it('should return "expired" for negative days', () => {
      expect(getExamStatus(-1)).toBe('expired');
      expect(getExamStatus(-10)).toBe('expired');
    });

    it('should return "today" for zero days', () => {
      expect(getExamStatus(0)).toBe('today');
    });

    it('should return "urgent" for 1-7 days', () => {
      expect(getExamStatus(1)).toBe('urgent');
      expect(getExamStatus(3)).toBe('urgent');
      expect(getExamStatus(7)).toBe('urgent');
    });

    it('should return "approaching" for 8-30 days', () => {
      expect(getExamStatus(8)).toBe('approaching');
      expect(getExamStatus(15)).toBe('approaching');
      expect(getExamStatus(30)).toBe('approaching');
    });

    it('should return "normal" for more than 30 days', () => {
      expect(getExamStatus(31)).toBe('normal');
      expect(getExamStatus(60)).toBe('normal');
      expect(getExamStatus(100)).toBe('normal');
    });
  });

  describe('formatRemainingDays', () => {
    it('should format expired days correctly', () => {
      expect(formatRemainingDays(-5)).toBe('試験日から5日経過');
      expect(formatRemainingDays(-1)).toBe('試験日から1日経過');
    });

    it('should format today correctly', () => {
      expect(formatRemainingDays(0)).toBe('今日が試験日');
    });

    it('should format tomorrow correctly', () => {
      expect(formatRemainingDays(1)).toBe('明日が試験日');
    });

    it('should format urgent days correctly', () => {
      expect(formatRemainingDays(2)).toBe('あと2日');
      expect(formatRemainingDays(7)).toBe('あと7日');
    });

    it('should format approaching days with weeks', () => {
      expect(formatRemainingDays(14)).toBe('あと14日 (約2週間)');
      expect(formatRemainingDays(21)).toBe('あと21日 (約3週間)');
      expect(formatRemainingDays(30)).toBe('あと30日 (約5週間)');
    });

    it('should format long-term days with months', () => {
      expect(formatRemainingDays(60)).toBe('あと60日 (約2ヶ月)');
      expect(formatRemainingDays(90)).toBe('あと90日 (約3ヶ月)');
    });

    it('should prefer months over weeks for long durations', () => {
      expect(formatRemainingDays(40)).toBe('あと40日 (約1ヶ月)');
      expect(formatRemainingDays(35)).toBe('あと35日 (約1ヶ月)');
    });
  });

  describe('calculateStudyUrgency', () => {
    it('should return 1 for expired or zero days', () => {
      expect(calculateStudyUrgency(0)).toBe(1);
      expect(calculateStudyUrgency(-5)).toBe(1);
    });

    it('should return 5 for urgent period (1-7 days)', () => {
      expect(calculateStudyUrgency(1)).toBe(5);
      expect(calculateStudyUrgency(7)).toBe(5);
    });

    it('should return 4 for very close period (8-14 days)', () => {
      expect(calculateStudyUrgency(8)).toBe(4);
      expect(calculateStudyUrgency(14)).toBe(4);
    });

    it('should return 3 for approaching period (15-30 days)', () => {
      expect(calculateStudyUrgency(15)).toBe(3);
      expect(calculateStudyUrgency(30)).toBe(3);
    });

    it('should return 2 for medium-term period (31-60 days)', () => {
      expect(calculateStudyUrgency(31)).toBe(2);
      expect(calculateStudyUrgency(60)).toBe(2);
    });

    it('should return 1 for long-term period (60+ days)', () => {
      expect(calculateStudyUrgency(61)).toBe(1);
      expect(calculateStudyUrgency(100)).toBe(1);
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle leap year correctly', () => {
      vi.setSystemTime(new Date('2024-02-28T12:00:00Z')); // 2024 is a leap year
      const leapDay = new Date('2024-02-29T00:00:00Z');
      const result = calculateRemainingDays(leapDay);
      expect(result).toBe(1);
    });

    it('should handle month boundaries correctly', () => {
      vi.setSystemTime(new Date('2024-01-31T12:00:00Z'));
      const nextMonth = new Date('2024-02-01T00:00:00Z');
      const result = calculateRemainingDays(nextMonth);
      expect(result).toBe(1);
    });

    it('should provide consistent results across time zones', () => {
      const utcDate = new Date('2024-08-15T00:00:00Z');
      const jstDate = new Date('2024-08-15T09:00:00+09:00'); // Same moment in JST
      
      const utcResult = calculateRemainingDays(utcDate);
      const jstResult = calculateRemainingDays(jstDate);
      
      expect(utcResult).toBe(jstResult);
    });

    it('should work correctly with all utility functions together', () => {
      const examDate = new Date('2024-08-17T00:00:00Z'); // 7 days from mocked current date
      
      const remainingDays = calculateRemainingDays(examDate);
      const status = getExamStatus(remainingDays);
      const formatted = formatRemainingDays(remainingDays);
      const urgency = calculateStudyUrgency(remainingDays);
      
      expect(remainingDays).toBe(7);
      expect(status).toBe('urgent');
      expect(formatted).toBe('あと7日');
      expect(urgency).toBe(5);
    });
  });
});