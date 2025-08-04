import { ReviewItem, ReviewSession } from "src/domain/entities/ReviewSchedule.js";

export interface IReviewRepository {
  // ReviewItem管理
  saveReviewItem(item: ReviewItem): Promise<ReviewItem>;
  findReviewItemById(id: number): Promise<ReviewItem | null>;
  findReviewItemsByUser(userId?: number): Promise<ReviewItem[]>;
  findDueReviewItems(date: Date, userId?: number): Promise<ReviewItem[]>;
  updateReviewItem(
    id: number,
    updates: Partial<ReviewItem>
  ): Promise<ReviewItem>;
  deleteReviewItem(id: number): Promise<void>;

  // ReviewSession管理
  saveReviewSession(session: ReviewSession): Promise<ReviewSession>;
  findReviewSessionsByUser(userId?: number): Promise<ReviewSession[]>;
  findRecentReviewSessions(
    days: number,
    userId?: number
  ): Promise<ReviewSession[]>;
}
