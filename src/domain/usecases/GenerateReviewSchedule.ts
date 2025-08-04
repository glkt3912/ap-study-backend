import { IReviewRepository } from 'src/domain/repositories/IReviewRepository.js';
import { IStudyLogRepository } from 'src/domain/repositories/IStudyLogRepository.js';
import { ReviewItem, ForgettingCurveConfig } from 'src/domain/entities/ReviewSchedule.js';

export class GenerateReviewSchedule {
  private forgettingCurve: ForgettingCurveConfig = {
    stage1: 1,    // 1日後
    stage2: 3,    // 3日後  
    stage3: 7,    // 7日後
    stage4: 14,   // 14日後
    stage5: 30,   // 30日後
    stage6: 60,   // 60日後
    stage7: 120   // 120日後
  };

  constructor(
    private reviewRepository: IReviewRepository,
    private studyLogRepository: IStudyLogRepository
  ) {}

  async execute(userId?: number): Promise<ReviewItem[]> {
    // 過去の学習記録から復習項目を抽出
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90); // 過去90日

    const studyLogs = await this.studyLogRepository.findByDateRange(startDate, endDate);
    const existingReviewItems = await this.reviewRepository.findReviewItemsByUser(userId);

    // 新しい復習項目を生成
    const newReviewItems: ReviewItem[] = [];
    
    for (const log of studyLogs) {
      if (log.topics && Array.isArray(log.topics)) {
        for (const topic of log.topics) {
          const existing = existingReviewItems.find(
            item => item.subject === log.subject && item.topic === topic
          );

          if (!existing) {
            const reviewItem = this.createReviewItem(log, topic, userId);
            newReviewItems.push(reviewItem);
          }
        }
      }
    }

    // 既存項目の更新と新規項目の保存
    const allReviewItems = [...existingReviewItems];
    
    for (const item of newReviewItems) {
      const saved = await this.reviewRepository.saveReviewItem(item);
      allReviewItems.push(saved);
    }

    // 今日の復習項目を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueItems = await this.reviewRepository.findDueReviewItems(today, userId);

    return dueItems.sort((a, b) => b.priority - a.priority);
  }

  async completeReview(itemId: number, understanding: number, studyTime: number): Promise<ReviewItem> {
    const item = await this.reviewRepository.findReviewItemById(itemId);
    if (!item) {
      throw new Error('Review item not found');
    }

    // 理解度に基づいて次回復習日を計算
    const nextReviewDate = this.calculateNextReviewDate(item, understanding);
    const newStage = this.getNextForgettingStage(item.forgettingCurveStage, understanding);
    
    const updates = {
      lastStudyDate: new Date(),
      nextReviewDate,
      reviewCount: item.reviewCount + 1,
      understanding,
      forgettingCurveStage: newStage,
      intervalDays: this.getIntervalForStage(newStage),
      priority: this.calculatePriority(item, understanding)
    };

    return await this.reviewRepository.updateReviewItem(itemId, updates);
  }

  private createReviewItem(studyLog: any, topic: string, userId?: number): ReviewItem {
    const now = new Date();
    const nextReviewDate = new Date();
    nextReviewDate.setDate(now.getDate() + this.forgettingCurve.stage1);

    return {
      userId: userId || 0,
      subject: studyLog.subject,
      topic,
      lastStudyDate: new Date(studyLog.date),
      nextReviewDate,
      reviewCount: 0,
      difficulty: this.estimateDifficulty(studyLog.understanding),
      understanding: studyLog.understanding,
      priority: this.calculateInitialPriority(studyLog.understanding),
      forgettingCurveStage: 1,
      intervalDays: this.forgettingCurve.stage1,
      isCompleted: false
    };
  }

  private calculateNextReviewDate(item: ReviewItem, understanding: number): Date {
    const nextDate = new Date();
    let intervalDays: number;

    if (understanding >= 4) {
      // 理解度が高い場合は次の段階へ
      const nextStage = Math.min(item.forgettingCurveStage + 1, 7);
      intervalDays = this.getIntervalForStage(nextStage);
    } else if (understanding >= 3) {
      // 普通の理解度の場合は同じ段階を維持
      intervalDays = this.getIntervalForStage(item.forgettingCurveStage);
    } else {
      // 理解度が低い場合は前の段階に戻る
      const prevStage = Math.max(item.forgettingCurveStage - 1, 1);
      intervalDays = this.getIntervalForStage(prevStage);
    }

    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate;
  }

  private getNextForgettingStage(currentStage: number, understanding: number): number {
    if (understanding >= 4) {
      return Math.min(currentStage + 1, 7);
    } else if (understanding >= 3) {
      return currentStage;
    } else {
      return Math.max(currentStage - 1, 1);
    }
  }

  private getIntervalForStage(stage: number): number {
    switch (stage) {
      case 1: return this.forgettingCurve.stage1;
      case 2: return this.forgettingCurve.stage2;
      case 3: return this.forgettingCurve.stage3;
      case 4: return this.forgettingCurve.stage4;
      case 5: return this.forgettingCurve.stage5;
      case 6: return this.forgettingCurve.stage6;
      case 7: return this.forgettingCurve.stage7;
      default: return this.forgettingCurve.stage1;
    }
  }

  private estimateDifficulty(understanding: number): number {
    // 理解度から難易度を逆算（理解度が低い = 難易度が高い）
    return Math.max(1, Math.min(5, 6 - understanding));
  }

  private calculateInitialPriority(understanding: number): number {
    // 理解度が低いほど優先度を高く
    const basePriority = (5 - understanding) * 20;
    return Math.max(10, Math.min(100, basePriority));
  }

  private calculatePriority(item: ReviewItem, newUnderstanding: number): number {
    let priority = item.priority;

    // 理解度による調整
    if (newUnderstanding < 3) {
      priority += 20; // 理解度が低い場合は優先度アップ
    } else if (newUnderstanding >= 4) {
      priority -= 10; // 理解度が高い場合は優先度ダウン
    }

    // 復習回数による調整（復習回数が少ないほど優先度アップ）
    if (item.reviewCount === 0) {
      priority += 15;
    } else if (item.reviewCount === 1) {
      priority += 10;
    }

    // 経過日数による調整
    const daysSinceLastStudy = Math.floor(
      (Date.now() - item.lastStudyDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastStudy > item.intervalDays * 1.5) {
      priority += 25; // 予定より大幅に遅れている場合
    } else if (daysSinceLastStudy > item.intervalDays) {
      priority += 15; // 予定より遅れている場合
    }

    return Math.max(0, Math.min(100, Math.round(priority)));
  }
}